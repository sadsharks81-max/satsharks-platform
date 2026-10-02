# Architecture

## Overview

```
                 ┌──────────────────────┐
  Browser ─────> │ apps/web  (Next.js)  │  Vercel
                 └──────────┬───────────┘
                            │ /api/*  (server-side rewrite)
                 ┌──────────▼───────────┐        ┌───────────────┐
                 │ apps/api  (Express)  │ ─────> │ MongoDB Atlas │
                 └──────────┬───────────┘        └───────▲───────┘
                            │ enqueue (later)            │
                 ┌──────────▼───────────┐                │
                 │ Redis + BullMQ       │                │
                 └──────────┬───────────┘                │
                 ┌──────────▼───────────┐                │
                 │ apps/worker          │ ───────────────┘
                 └──────────┬───────────┘
                            │ (later phases)
                 ┌──────────▼───────────┐
                 │ S3-compatible storage│
                 └──────────────────────┘
```

It is an npm-workspaces monorepo. Apps never import from each other; anything shared lives in `packages/`.

## Frontend (`apps/web`)

- Next.js App Router, React, TypeScript, Tailwind CSS, TanStack Query.
- Routes: `/`, `/login`, `/register`, `/dashboard`, `/practice`, `/admin`, `/admin/papers/[id]`.
- Shared layout with navigation, plus `loading.tsx`, `error.tsx` and `not-found.tsx`.
- The browser only calls its own origin. `next.config.ts` rewrites `/api/*` to the Express API
  (`API_URL`). The auth cookie is therefore first-party, and no cross-site cookie configuration
  is needed between Vercel and Railway.
- Signed-in pages are gated in the client by `RequireUser`. That controls what is rendered only;
  the API enforces access on every request.

## API (`apps/api`)

- Express 5 + TypeScript, run with `tsx`.
- Layers: `routes` → `middleware` → `controllers` → `services` → `repositories` → models.
- Middleware: `helmet`, CORS restricted to `CLIENT_URL`, 100 kB JSON limit, cookie parser,
  request logging, rate limiting, Zod body validation, `requireDb`, `requireAuth`,
  `requirePermission`, and one central error handler.
- Every response uses one envelope: `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.
- The API starts even if MongoDB is unreachable, so `/api/health` can report it; data routes answer `503`.

## Worker (`apps/worker`)

- Holds the import pipeline and the queue worker.
- The same job function (`importPaperJob`) is used by the CLI (`npm run scrape:paper`) and by the
  BullMQ worker, so there is one import code path.
- Source-specific code is isolated in `src/scrapers/source/<source>/`. The normalizer converts to
  SAT Sharks shapes; `import.service.ts` only ever sees those shapes.
- Phase 1 registers one queue, `paper-import`. Without `REDIS_URL` the worker logs a warning and exits.
- Later phases add PDF processing, AI extraction, image processing and analytics jobs here.

## Shared packages

| Package | Purpose |
| --- | --- |
| `@satsharks/types` | Enums, DTOs, and the single role → permission map |
| `@satsharks/validation` | Zod schemas for auth input and for normalized papers/questions |
| `@satsharks/config` | Loads `.env` from the repo root and validates it |
| `@satsharks/db` | Mongoose connection and the User, Paper and Question models |
| `@satsharks/utils` | JSON logger with secret redaction, small helpers |

The models live in `@satsharks/db` rather than inside `apps/api` because the worker writes the
same collections. `apps/api/src/models` re-exports them.

## MongoDB

MongoDB Atlas through Mongoose. One reusable connection module (`packages/db/src/connection.ts`),
pool size 10. See [database.md](database.md).

## Redis

Used only for BullMQ queues. Optional in Phase 1. When the API runs on more than one instance,
the rate limiter should also move to a Redis store.

## Object storage

Not used in Phase 1. `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY` and
`STORAGE_SECRET_KEY` are reserved for an S3-compatible bucket (uploaded PDFs, extracted images).
Question assets are stored as `{ kind, url }`, so pointing them at our own bucket later is a data
change, not a schema change.

## Deployment

| Part | Initial host | Notes |
| --- | --- | --- |
| Web | Vercel | Set `API_URL` to the API's public URL |
| API | Railway | `npm run start:api`; set `NODE_ENV=production`, `CLIENT_URL`, `JWT_SECRET`, `MONGODB_URI` |
| Worker | Railway | `npm run start:worker`; set `MONGODB_URI`, `REDIS_URL` |
| Database | MongoDB Atlas | Restrict network access to the API and worker |

Nothing is deployed in Phase 1.

Moving the API and worker to AWS later needs no code change: both are plain Node processes
configured entirely by environment variables, and storage is addressed through the S3 API.
