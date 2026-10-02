# API

Base URL: `http://localhost:4000` in development. The web app reaches it through its own origin
at `/api/*`.

## Conventions

Success:

```json
{ "ok": true, "data": { } }
```

Failure:

```json
{ "ok": false, "error": { "code": "bad_request", "message": "Invalid request", "details": [] } }
```

| Status | `code` | When |
| --- | --- | --- |
| 400 | `bad_request` | Validation failed, malformed JSON or malformed ID |
| 401 | `unauthorized` | Missing, invalid or expired session; wrong credentials |
| 403 | `forbidden` | Signed in without the required permission; inactive account |
| 404 | `not_found` | Unknown route or record |
| 409 | `conflict` | Email already registered |
| 429 | `rate_limited` | Too many requests |
| 503 | `service_unavailable` | Database not connected |
| 500 | `internal_error` | Unexpected error (details are logged, not returned) |

Authentication is a JWT in an httpOnly cookie named `ss_token`, valid for 7 days. Requests need no
`Authorization` header.

Rate limits: 300 requests per minute per IP on `/api/*`; 20 per 15 minutes per IP on register and login.

## Health

### `GET /api/health`

No authentication. Works without a database.

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "service": "sat-sharks-api",
    "environment": "development",
    "database": "connected",
    "uptimeSeconds": 12,
    "time": "2026-10-02T17:36:24.939Z"
  }
}
```

`database` is `connected`, `disconnected` or `not_configured`.

## Auth

`PublicUser`: `{ id, name, email, role, status, permissions[] }`.

### `POST /api/auth/register`

Body: `{ "name": string (2–80), "email": string, "password": string (8–72) }`

Creates a `student` account, sets the session cookie, returns `201` with `{ user }`.
Errors: `400`, `409`.

### `POST /api/auth/login`

Body: `{ "email": string, "password": string }`

Sets the session cookie, returns `{ user }`. Errors: `400`, `401` (same message for an unknown
email and a wrong password), `403` for a blocked account.

### `POST /api/auth/logout`

Clears the session cookie. Returns `{ "loggedOut": true }`.

### `GET /api/auth/me`

Requires a session. Returns `{ user }`, or `401`.

## Admin

Every route requires a session and the `admin:access` permission (roles `staff` and `admin`).

### `GET /api/admin/papers`

Permission `papers:read`. Returns `{ papers: PaperSummary[] }`, newest first.

`PaperSummary`: `id`, `title`, `description`, `source`, `sourcePaperId`, `status`, `sections`,
`modules`, `adaptive`, `questionCount`, `createdAt`, `updatedAt`.

### `GET /api/admin/papers/:id`

Permission `papers:read`. Returns `{ paper: PaperSummary, questions: QuestionListItem[] }`.

`QuestionListItem`: `id`, `section`, `moduleNumber`, `moduleType`, `questionNumber`,
`questionType`, `difficulty`, `topic`, `skill`, `prompt`, `hasCorrectAnswer`.

The correct answer itself is not returned; only whether one was imported.

## Import

There is no HTTP import endpoint in Phase 1. Importing is a command, so that a long-running job
never runs inside a request:

```bash
npm run scrape:paper -- <path-to.har> [--attempt <id>] [--dry-run]
```

## Practice (students)

Every route requires a session. A student only ever sees **published** papers and questions, and
only their own attempts (another user's attempt answers `404`).

### `GET /api/practice/catalog`

Returns `{ exams, topics }`.

- `exams[]`: `examId`, `name`, `examDate`, `sections` — per section, the `paperId` and `questionCount`.
  Papers from the same exam are grouped into one entry.
- `topics`: per section, the list of `{ topic, skills[] }` present in published questions.

Cached in memory for 60 seconds; cleared when an admin changes a paper's status or a question.

### `POST /api/practice/attempts`

Starts a drill. Body:

| Field | Type | Notes |
| --- | --- | --- |
| `paperId` | id | Must be published |
| `topics`, `skills` | string[] | Optional filters |
| `difficulty` | `easy` \| `medium` \| `hard` \| null | |
| `limit` | 1–200 \| null | null = every match, up to 200 |
| `timed`, `timeMinutes` | boolean, 1–600 | |
| `excludeAnswered` | boolean | Skip questions this student has already answered |
| `name` | string | Optional title |

Questions are picked at random from the matches. Returns `201` with `{ attempt }`.
Errors: `404` paper not available, `400` no questions match.

### `GET /api/practice/attempts`

The student's attempts, newest first (up to 100).

### `GET /api/practice/attempts/:id`

`{ attempt, navigation[] }`. `navigation` has one entry per question: `position`, `answered`,
`flagged`, `checked`. `attempt.timeRemainingSeconds` is computed by the server.

A timed attempt whose time has run out is submitted automatically the next time it is touched.

### `GET /api/practice/attempts/:id/questions/:position`

One question: text, passage, choices, images and figure data, plus the student's saved `answer`
and `flagged`. `result` is `null` unless the question has been checked or the attempt has ended.
**The answer key is never included before that.**

### `PATCH /api/practice/attempts/:id/questions/:position`

Body: `{ answer?: string | null, flagged?: boolean }`. Saves one or both.
Errors: `409` if the attempt has ended, or if the question was already checked and the answer is
being changed.

### `POST /api/practice/attempts/:id/questions/:position/check`

Grades one answered question and returns it with `result` (`correct`, `correctAnswer`,
`explanation`). The question is then locked. `400` if it has no answer yet.

### `POST /api/practice/attempts/:id/end`

Grades everything and closes the attempt. Safe to call twice.

### `GET /api/practice/attempts/:id/result`

`{ attempt, questions[] }` with the answer key, topic, skill and difficulty for every question.
`409` until the attempt has ended.

### Grading

- Multiple choice: the selected key must equal the correct key.
- Typed answers: any accepted value matches, as does a numerically equal fraction or decimal.
  A decimal that fills the answer box (5 characters, or 6 if negative) may be truncated or
  rounded at its last digit.
- An unanswered question is counted as unanswered, not incorrect.

## Admin: papers and question bank

In addition to the two paper routes above:

| Route | Permission | Purpose |
| --- | --- | --- |
| `GET /api/admin/stats` | `admin:access` | Counts of users, papers, questions and attempts |
| `PATCH /api/admin/papers/:id/status` | `papers:write` | Body `{ status }`. Also sets the status of the paper's questions |
| `POST /api/admin/papers/status` | `papers:write` | Body `{ status, ids? }`. Omit `ids` to apply to every paper |
| `GET /api/admin/questions` | `questions:read` | Filterable, paginated list (below) |
| `GET /api/admin/questions/facets` | `questions:read` | Topics and skills present, per section |
| `GET /api/admin/questions/:id` | `questions:read` | One question with its answer key |
| `PATCH /api/admin/questions/:id` | `questions:write` | Edit difficulty, topic, skill, prompt, passage, explanation, correct answer |
| `DELETE /api/admin/questions/:id` | `questions:write` | Deletes it and corrects the paper's counts |

`GET /api/admin/papers/:id` now returns the first 50 questions as a preview.

`GET /api/admin/questions` query parameters: `section`, `topic`, `skill`,
`difficulty` (`easy` / `medium` / `hard` / `none`), `status`, `paperId`, `search`
(text in the question or passage, or an exact source ID), `page`, `pageSize` (max 100).
Returns `{ questions, total, page, pageSize }`.

## Assets

### `GET /api/assets/:key`

Public. Serves a hosted question image. Cached for one year (keys never change), and sent with a
sandboxing Content-Security-Policy so an SVG opened directly cannot run scripts.
