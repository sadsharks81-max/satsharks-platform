# Phase 1 Completion Report

**Status: the brief's deliverables are done, with one exception, and the work went beyond the
brief.** The whole question bank of the reference site is imported, labelled and stored, images
are hosted by us, and students can already practise on it.

The exception: **no adaptive mock has been recorded**, so the adaptive findings rest on the
reference site's client code only.

The proposal's Week 1 (Checkpoints 1.1 and 1.2) is larger than the brief and is **not** complete;
section 18 lists what is missing.

Last updated: 2026-10-03.

## 1. Completed

- Monorepo: `apps/web`, `apps/api`, `apps/worker`, five shared packages.
- Source investigation: API, drill flow (from real traffic), mock flow (from client code).
- Two import paths: from a recorded HAR, and live from the source API with a session token.
- **The full bank imported: 9,927 questions in 41 Draft papers**, every one with a correct
  answer, a topic and a skill.
- **201 question images copied into our own storage**; no question points at the source's servers.
- Authentication, permission-based authorization, admin account creation.
- Student practice: exam catalogue, drill builder, Bluebook-style test screen, answer checking,
  timer, results and review.
- Admin: dashboard, publish and hide controls, question bank with filters and search, question
  editor with live preview, delete.
- Rendering: LaTeX, tables, bar charts, line charts, right triangles, images, text markup.
- Documentation for architecture, database, API, scraping, adaptive testing, security, performance.

Beyond the brief (done at the product owner's request): the full collection instead of one
paper, the practice engine, and the student and admin screens.

## 2. Project Structure

```
apps/web        Next.js (App Router). (site) pages with navigation, (test) full-screen test view
apps/api        Express API
apps/worker     Import pipelines, image copy, queue worker
packages/types, validation, config, db, utils
docs/           Documentation, proposal, references
data/           Import output and cached source responses (git-ignored)
```

Deviations from the brief: `packages/db` holds the models (shared by API and worker); reference
material stays under `docs/`; commands live in `apps/*/src/cli`, not a top-level `scripts/`.

## 3. Database Models

User, Paper, Question, Asset and Attempt; see [database.md](database.md). All are in use on
MongoDB Atlas (database `satsharks`, about 22 MB with images). Unique indexes verified.

## 4. Authentication

`POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me`. bcrypt (cost 12), JWT in an
httpOnly cookie, role and status re-read from the database on every request, permission checks
on every admin route. Verified against the real database (section 17).

## 5. Paper Imported

41 papers, one per exam source and section, for example
"SAT June 06, 2026 Administration — Math — question bank (186)". Each is a question bank, not a
timed paper: the reference site has no fixed papers.

The original proof of concept (one 50-question drill from a HAR recording) was imported, checked
for duplicates on re-run, and later deleted because the full bank contains it.

## 6. Number of Questions Imported

**9,927**: 2,207 Math and 7,720 Reading & Writing. Every per-section count on the source was
matched exactly. Re-running an import inserts nothing.

| | Math | Reading & Writing |
| --- | --- | --- |
| Exam sources | 15 | 26 |
| Multiple choice | 1,610 | 7,720 |
| Student-produced response | 597 | 0 |
| With an image | 222 | 0 |
| With a table or chart | 136 | 577 |
| With an explanation | 0 | 0 |

## 7. Sections Discovered

Math and Reading & Writing.

## 8. Modules Discovered

None in the imported data: the bank is flat (module type `none`). From the source's client code,
its mocks use `m1`, `m2_easy` and `m2_hard`; Math is 44 questions over 2 modules in 70 minutes,
Reading & Writing 54 over 2 modules in 64 minutes.

## 9. Difficulty Information

The source does not put difficulty, topic or skill on a question. They were recovered by querying
its filters once per value.

- **Topic and skill:** every question has both.
- **Reading & Writing difficulty:** 4,739 easy, 2,981 hard. Usable.
- **Math difficulty:** 2,139 easy, 68 hard. **Not usable.** In 14 of 15 Math exam sources every
  question is tagged easy, which looks like a default. Only March 14, 2026 has a real split.
- The source has no "medium". Nothing is stored as medium.

## 10. Adaptive Routing Findings

Adaptive routing rule: **not directly exposed**, and no adaptive attempt has been recorded.
See [adaptive-testing.md](adaptive-testing.md).

## 11. Observed Behavior

From real traffic:

- All content requires login; the login has a captcha.
- The source has no fixed papers; drills and mocks are assembled per attempt.
- `pFilter` returns the IDs matching a filter without creating anything.
- `rpGetResult` returns every question of a drill with its answer, opened or not.
- Figures are stored as data (`viz_data`) or as SVG files; `{viz}` in the text marks where a
  figure belongs.

From client code only: submitting Module 1 sends just the attempt ID, and the attempt then
carries `m2_type` (`m2_hard` or `m2_easy`).

## 12. Inferred Behavior

- Module 2 is selected on the server from the Module 1 correct count.
- The Math "easy" tag is a default, not a rating.
- Questions tagged neither easy nor hard would be medium. None exist in the data.

## 13. Unknown Behavior

- The routing threshold; whether Module 1 is fixed per exam source; the mock response shapes.
- Why 7 questions counted in the source's catalogue totals are returned by no filter.

## 14. Raw Data Location

`data/collections/exam-<id>-<section>/raw/` (one folder per bank: catalogue, filter and drill
responses). `data/proof-of-concept/` holds the first HAR import. Git-ignored.

## 15. Normalized Data Location

`data/collections/exam-<id>-<section>/normalized/` (`paper.json`, `questions.json`), with
`metadata.json` beside it.

## 16. Commands Used

```bash
npm install
npm run typecheck
npm test
npm run dev:api
npm run dev:web
npm run build:web
npm run scrape:paper -- docs/references/network/mathmodule.org.har
npm run collect:bank -- --list
npm run collect:bank -- --all --section math
npm run collect:bank -- --all --section rw
npm run assets:copy
ADMIN_PASSWORD=... npm run create:admin -- --email <email> --name "<name>"
```

## 17. Tests Passed

| Check | Result |
| --- | --- |
| Type check, all workspaces | Passed |
| Unit tests: import pipelines (14) and grading (6) | 20 passed |
| Web production build, 12 routes | Passed |
| End-to-end API run against the real database | 67 of 68 passed |
| Timer expiry and exclude-answered, against the real database | Passed |
| Bank totals verified in MongoDB against the source's counts | Passed |
| Image copy, and a second run finding nothing to do | Passed |
| Screens reviewed from headless-browser screenshots | Reviewed |

The one end-to-end failure was a wrong expectation in the test, not a defect (it exposed the
mis-tagged questions in section 18).

What the end-to-end run covers: registration and login; a student blocked from every admin
route; the catalogue showing only published exams; drill creation with filters, limits and
timer; another student unable to open someone's attempt; questions arriving without the answer
key; saving, flagging, checking and the lock after checking; results refused before submission
and correct after; scores matching the answers; question bank filters, search and pagination;
question editing and its validation; image serving with sandbox headers.

Screens reviewed: dashboard, drill builder, Math and Reading & Writing test screens, typed-answer
question, answer check, question navigator, finish dialog, results, review popup, admin
dashboard, question bank, question editor with each figure type, and a phone-width layout.

Not tested:

| Check | Why |
| --- | --- |
| A real adaptive mock import | No recording |
| Browsers other than headless Chrome | Not available here |
| Use by a person, including keyboard-only and screen-reader use | Reviewed from screenshots only |
| The drawn figures against the source's own rendering | Could not compare side by side |
| Load: many students at once | Out of scope for this phase |
| Deployment to Vercel and Railway | Not deployed |
| Worker consuming a queue job | No Redis |

## 18. Known Issues

Content:

- **The source's name is inside the content.** The string "[bluebooky.com]" appears in 537 chart
  titles and axis labels, and it is displayed as stored. Whether to keep, remove or replace it is
  a decision for SAT Sharks, tied to the content-ownership question in [scraping.md](scraping.md).
- Math difficulty is unusable (section 9).
- No explanations exist for any question.
- 23 questions carry a skill under the wrong topic at the source (for example 7 "Nonlinear
  functions" questions filed under Algebra). Stored as received.
- One Reading & Writing question is listed under two exam sources and is stored in both.
- The right-triangle figure is drawn from the source's parameters by our own code; the meaning
  of its `orientation` field was inferred.

Product:

- Drills only. No adaptive test, no module structure, no 400–1600 score.
- The calculator button opens Desmos in a separate window; an embedded calculator needs a Desmos API key.
- The reference sheet lists the formulas as text, without the official diagrams.
- No highlighter, notes, line reader or "report a problem".
- A drill's timer cannot be paused; closing the tab does not stop it.
- Images are stored in MongoDB, which suits 7 MB but not uploaded PDFs.
- Re-running `collect:bank` resets image links to the source; run `assets:copy` after it.

Proposal Week 1 items not built:

- Forgot password, Google sign-in, email service.
- The five user types (region and plan).
- Landing, pricing, terms, privacy and refund pages.
- PDF upload with AI extraction and the side-by-side review screen.
- Building a paper from approved questions; score conversion tables.
- Deployment with a live link.

Other: the rate limiter is in memory (one API instance); there is no change-password screen.

## 19. Recommendations for Phase 2

1. Get SAT Sharks' written decision on using this content and on the embedded source name
   before anything is shown to real students.
2. Deploy to Vercel and Railway so the client can test on a live link.
3. Rate Math difficulty ourselves. Options: an editor's pass in the admin screen (already
   possible per question), or deriving it from students' results once there is usage.
4. Record one adaptive mock, then build SAT Sharks' adaptive test: papers assembled from the
   bank into `m1`, `m2_easy` and `m2_hard`, with SAT Sharks' own routing rule and score table.
5. Finish Checkpoint 1.1: password reset, Google sign-in, email, user types, public pages.
6. Decide whether PDF upload with AI extraction (Checkpoint 1.2) is still wanted now that a
   bank exists.
7. Add the remaining Bluebook tools: embedded Desmos, highlights and notes, line reader.
8. Move images to S3-compatible storage before adding larger files.
