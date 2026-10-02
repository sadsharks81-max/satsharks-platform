# SAT Sharks 2.0

Digital SAT practice platform: Bluebook-style adaptive tests on real past papers, with scoring,
analytics and engagement features. The full scope is in
[docs/purposal/SAT_Sharks_Proposal_v4_4Weeks.pdf](docs/purposal/SAT_Sharks_Proposal_v4_4Weeks.pdf).

**Current Phase: Phase 1 — Foundation + Adaptive Scraping Proof of Concept**

What exists today: a 9,927-question bank, practice drills with a Bluebook-style test screen,
and an admin question bank.

Status and open items: [docs/phase-1-completion.md](docs/phase-1-completion.md).

## Architecture

```
Browser ──> Next.js (apps/web, Vercel) ──/api/* proxy──> Express API (apps/api, Railway) ──> MongoDB Atlas
                                                                                              ^
                              Worker (apps/worker, Railway) ── import / background jobs ──────┘
                                   └── Redis + BullMQ (queues), S3-compatible storage (later phases)
```

Details: [docs/architecture.md](docs/architecture.md).

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query |
| API | Node.js, Express 5, TypeScript, Zod |
| Database | MongoDB Atlas, Mongoose 8 |
| Background jobs | BullMQ + Redis (worker process) |
| Auth | bcrypt password hashes, JWT in an httpOnly cookie, permission-based authorization |

## Repository Structure

```
apps/
  web/        Next.js app: home, login, drills and test screen, results, admin question bank
  api/        Express API: config, controllers, middleware, models, routes, services, repositories
  worker/     Import pipeline (scrapers -> parsers -> normalizers -> validators) + queue worker
packages/
  types/      Shared enums, DTOs and the role -> permission map
  validation/ Zod schemas (auth input, normalized paper/question)
  config/     Environment loading
  db/         MongoDB connection + User / Paper / Question models (shared by api and worker)
  utils/      Logger and small helpers
docs/         Architecture, database, API, scraping, adaptive testing, security, performance
  references/ Screenshots and HAR recordings of the reference site
data/         Import output (raw + normalized). Git-ignored.
```

## Local Setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env      # then fill in the values below
```

## Environment Variables

| Variable | Needed by | Notes |
| --- | --- | --- |
| `JWT_SECRET` | api | At least 32 random characters |
| `MONGODB_URI` | api, worker | MongoDB Atlas connection string |
| `PORT` | api | Default `4000` |
| `CLIENT_URL` | api | Web origin for CORS. Default `http://localhost:3000` |
| `API_URL` | web | Where Next.js forwards `/api/*`. Default `http://localhost:4000` |
| `REDIS_URL` | worker | Optional in Phase 1 |
| `STORAGE_*` | — | S3-compatible storage, not used in Phase 1 |
| `SOURCE_NAME`, `SOURCE_API_HOST` | worker | Import source. Defaults target the reference site |

`.env` is git-ignored. Never commit real values.

## Running Frontend

```bash
npm run dev:web        # http://localhost:3000
```

## Running API

```bash
npm run dev:api        # http://localhost:4000/api/health
```

Without `MONGODB_URI` the API still starts and `/api/health` reports `database: "not_configured"`;
data routes answer `503`.

## Running Worker

```bash
npm run dev:worker     # listens on the paper-import queue when REDIS_URL is set
```

## Database Setup

1. Create a MongoDB Atlas cluster and a database user, and allow your IP.
2. Put the connection string in `.env` as `MONGODB_URI`.
3. Create the first admin (self-registration only creates students):

```bash
ADMIN_PASSWORD='choose-a-password' npm run create:admin -- --email you@example.com --name "Your Name"
```

Indexes are created automatically. Models: [docs/database.md](docs/database.md).

## Scraping Proof of Concept

The reference site keeps all content behind a captcha-protected login, so the importer does not
call the site. It reads a HAR file that a person records while using the site (a practice drill or an adaptive mock).

```bash
# validate only: writes raw + normalized files, does not touch MongoDB
npm run scrape:paper -- docs/references/network/mathmodule.org.har --dry-run

# import into MongoDB as a Draft paper (safe to run again; it upserts)
npm run scrape:paper -- docs/references/network/mathmodule.org.har
```

To collect a whole question bank live, using your own session token for the source site:

```bash
npm run collect:bank -- --list                       # exam sources and sizes
npm run collect:bank -- --exam 22 --section math     # one bank
npm run collect:bank -- --all                        # every bank; collected ones are skipped
npm run assets:copy                                  # copy question images into our storage
```

Imported papers are Draft. Publish them from `/admin` to make them available to students.

How to record the HAR, how to get a token, and what the importer does: [docs/scraping.md](docs/scraping.md).
What is known about adaptive routing: [docs/adaptive-testing.md](docs/adaptive-testing.md).

## Checks

```bash
npm run typecheck
npm test
```

## Current Phase

Phase 1 — Foundation + Adaptive Scraping Proof of Concept. Not included yet: adaptive tests,
scaled scores, analytics, payments, password reset, Google sign-in, PDF upload, deployment.

## Future Phases

1. **Phase 2 — Test engine:** Bluebook-replica test UI, adaptive modules, autosave, scoring, review.
2. **Phase 3 — Analytics & engagement:** history, mistake bank, drills, predicted score, goals, streaks, leaderboard.
3. **Phase 4 — Money, admin, SEO & launch:** plans, payments, admin portal, SEO/GEO, launch.
