# Database

MongoDB with Mongoose. Models are defined in `packages/db/src/models/`.

A field the source did not provide is stored as `null` (or `"unknown"` for module type). It is never guessed.

## User (`users`)

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | |
| `email` | string | Unique, lower-cased |
| `passwordHash` | string | bcrypt. Excluded from queries by default (`select: false`) |
| `role` | `student` \| `staff` \| `admin` | Default `student` |
| `status` | `active` \| `blocked` \| `deleted` | Default `active` |
| `createdAt`, `updatedAt` | date | |

Roles are extensible: add the role to `USER_ROLES` and its permissions to `ROLE_PERMISSIONS` in
`packages/types`. Routes check permissions (`admin:access`, `papers:read`, …), never role names.

The proposal's five user types (local/international × free/paid, plus admin) are a combination of
role, region and plan. Region and plan are not modelled yet; they arrive with payments.

Indexes: `email` (unique), `role`, `status`.

## Paper (`papers`)

| Field | Type | Notes |
| --- | --- | --- |
| `title`, `description` | string | |
| `source` | string | Where it came from, e.g. `bluecorn` |
| `sourcePaperId` | string | Its ID at the source |
| `status` | `draft` \| `published` \| `hidden` | Default `draft`. Imports never publish |
| `sections` | (`reading_writing` \| `math`)[] | |
| `modules` | array | See below |
| `adaptive` | object | See below |
| `questionCount` | number | |
| `metadata` | object | Ours: expected question count, what was unavailable |
| `sourceMetadata` | object | The source's own attempt fields, kept for debugging |

`modules[]`: `key`, `section`, `moduleNumber` (1, 2 or null), `moduleType`
(`m1` \| `m2_easy` \| `m2_hard` \| `none` \| `unknown`), `questionCount`, `timeLimitSeconds`.

`none` means the questions are a flat set with no module (a paper imported from a drill).
`unknown` means there is a module but the source did not say which.

A complete adaptive section has three modules: `m1`, `m2_easy` and `m2_hard`. A paper imported
from a single mock attempt only has the route that attempt was given.

`adaptive`:

| Field | Meaning |
| --- | --- |
| `isAdaptive` | A Module 2 route was observed |
| `routing` | `server_side` \| `client_side` \| `unknown`: where the source makes the decision |
| `observedRoute` | The Module 2 type seen, or null |
| `module1Correct` | Module 1 correct count in the observed attempt, or null |
| `routingThreshold` | Null unless a source explicitly exposes its rule |

Indexes: `{ source, sourcePaperId }` unique; `status`.

## Question (`questions`)

| Field | Type | Notes |
| --- | --- | --- |
| `paperId` | ObjectId → Paper | |
| `source`, `sourceQuestionId` | string | Stable ID of the question at the source |
| `section` | `reading_writing` \| `math` | |
| `moduleNumber` | 1 \| 2 \| null | |
| `moduleType` | `m1` \| `m2_easy` \| `m2_hard` \| `none` \| `unknown` | |
| `questionNumber` | number | Position within the module |
| `questionType` | `mcq` \| `spr` \| `other` | `spr` = student-produced response (grid-in) |
| `difficulty` | `easy` \| `medium` \| `hard` \| null | |
| `topic`, `skill` | string \| null | Domain and skill |
| `prompt` | string | May contain LaTeX (`$…$`, `$$…$$`) |
| `passage` | string \| null | |
| `choices` | `{ key, text, viz }[]` | Empty for `spr` |
| `correctAnswer` | `{ choiceKey, acceptedValues[] }` \| null | Excluded from queries by default |
| `explanation` | string \| null | Excluded from queries by default |
| `assets` | `{ kind: "image", url, maxWidth }[]` | |
| `viz` | any \| null | Structured chart/table data from the source |
| `sourceMetadata` | object | Source IDs, position and type as received |
| `status` | `draft` \| `published` \| `hidden` | |

`correctAnswer` and `explanation` use `select: false`, so a query has to ask for them explicitly.
This supports the proposal's rule that answers never reach the browser before submission.

Indexes:

| Index | Purpose |
| --- | --- |
| `{ paperId, moduleType, sourceQuestionId }` unique | Identity of an imported question |
| `{ paperId, section, moduleNumber, questionNumber }` | Reading a paper in order |
| `{ status, section, difficulty }` | Question bank filters |
| `{ status, topic, skill }` | Question bank filters |
| `{ source, sourceQuestionId }` | Finding the same source question across papers |

## Relationships

```
Paper 1 ──── * Question      (Question.paperId)
User                          (no relations yet; attempts arrive in Phase 2)
```

## Source IDs and re-importing

- A paper is upserted on `{ source, sourcePaperId }`.
- A question is upserted on `{ paperId, moduleType, sourceQuestionId }`.
- `status` is written only on first insert, so re-importing never undoes an admin's publish or hide.
- Questions that exist in the database but are missing from a later import are left in place.

For the reference site, `sourcePaperId` is the mock **attempt ID**, because that site has no
fixed papers (see [scraping.md](scraping.md)). `sourceQuestionId` is the site's `content_id`.

## Asset (`assets`)

Files we host ourselves; today, the question images copied from the source.

| Field | Type | Notes |
| --- | --- | --- |
| `key` | string | Unique. `<hash>.<extension>`; the public name under `/api/assets/` |
| `sourceUrl` | string | Unique. Where it was copied from |
| `contentType` | string | |
| `size` | number | Bytes |
| `data` | binary | The file |

Stored in MongoDB because the files are small SVGs (201 files, 7 MB) and no object storage is
configured. Questions refer to an asset by URL (`/api/assets/<key>`), so moving the bytes to
S3-compatible storage later changes only where that route reads from.

A question's `assets[]` entries now also carry `sourceUrl`, the original location.

## Attempt (`attempts`)

One student working through one drill.

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | |
| `kind` | `drill` | Adaptive tests will add a kind |
| `name`, `section`, `paperId` | | |
| `status` | `active` \| `done` | |
| `timed`, `timeLimitSeconds` | | |
| `startedAt` | date | The clock: remaining time is always computed from this on the server |
| `lastPosition` | number | Where to resume |
| `items[]` | | `questionId`, `answer`, `flagged`, `checked`, `correct` |
| `correct`, `incorrect`, `unanswered` | number | Set when the attempt ends |
| `completedAt` | date \| null | |

Index: `{ userId, status, createdAt }`.

Attempts reference questions by ID. Hiding a paper keeps its attempts; deleting a question
removes it from the review of attempts that included it.

```
User 1 ──── * Attempt * ──── * Question
Paper 1 ──── * Question
```
