# Performance

## Rule: heavy work runs in the worker

These operations must not run inside a request from a student:

| Operation | Why | Where it runs |
| --- | --- | --- |
| Scraping / importing | Many documents, large files | Worker (`paper-import` queue) or CLI |
| PDF parsing | CPU and memory heavy | Worker (later phase) |
| AI extraction | Slow external calls, retries | Worker (later phase) |
| Image processing | CPU heavy | Worker (later phase) |
| Analytics | Aggregations over all attempts | Worker (later phase) |

The intended flow: the API validates the request, enqueues a job, and returns a job ID at once.
The worker does the work. The client polls or is notified.

In Phase 1 the import is a CLI command (`npm run scrape:paper`) that calls the same job function
the queue worker uses. There is deliberately no HTTP import endpoint.

## API

- The Express process is stateless (the JWT is in a cookie), so it can be scaled horizontally.
  The in-memory rate limiter is the one exception; move it to Redis before adding instances.
- Read queries use `.lean()` and return plain objects.
- The MongoDB pool is capped at 10 connections per process. Check it against the Atlas tier's limit.
- JSON bodies are capped at 100 kB.

## Database

- Indexes match the expected queries; see [database.md](database.md).
- Imports use one `bulkWrite` for all questions of a paper.
- `GET /api/admin/papers/:id` returns every question of one paper (about 50–100 documents).
  The question bank across papers will need pagination.

## Frontend

- Marketing and auth pages are prerendered as static content.
- TanStack Query caches the session for 60 seconds, so navigating between pages does not
  re-request it.
- First-load JavaScript is about 106–117 kB per route in the production build.

## Later phases

- **Test engine:** autosave writes should be small and frequent. Timers must be authoritative on
  the server.
- **Leaderboard and analytics:** precompute in the worker and store the results; do not aggregate
  on page load.
- **Assets:** serve images from object storage through a CDN.
- **Load testing** is part of the proposal's Checkpoint 4.4.
