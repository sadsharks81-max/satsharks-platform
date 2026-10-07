# SAT Sharks — project context and work log

**Read this first when starting a new session.** It records what exists, why, what was decided,
what is half-done, and the traps already found. Keep it up to date: every session that changes the
project adds to the change log at the bottom and corrects anything above that is no longer true.

Last updated: 2026-10-07 (uploaded practice tests).

---

## 1. The project

- **Client:** SAT Sharks. **Developer contact:** Umair (works in this repository).
- **What it is:** a Digital SAT practice platform. Full scope and 4-week plan: the client proposal,
  kept locally at `docs/purposal/SAT_Sharks_Proposal_v4_4Weeks.pdf` (git-ignored: it is marked
  Confidential and the repository is public).
- **Reference site:** `bluecorn.org` (also branded "Bluebooky"; API host `ciao.bluebooky.org`).
  Umair wants SAT Sharks to work like it. Its screenshots are in `docs/references/screenshots/`.
  SAT Sharks keeps its own name and branding; layout, fonts and spacing follow the reference.
- **Repository:** `https://github.com/satsharks20/bluesharks` (public), branch `main`.
- **Phase 1 brief:** `docs/prompts/phase1.txt`. Status report: `docs/phase-1-completion.md`
  (accurate up to the adaptive-mock work; see the change log for what came after).

## 2. Current state (2026-10-07)

### Working

- Accounts: register, login, logout, session (`/api/auth/*`), roles `student` / `staff` / `admin`
  with permission checks. Admins are created with `npm run create:admin` (not by registration).
- **Country at sign-up** (required, ISO code): `PK` → `region: local`, anything else →
  `international`. Never from IP. Accounts made before this have `country`/`region` null.
- **Forgot / reset password** through Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Token: 32
  random bytes, only its SHA-256 stored, 30 minutes, single use, same answer for unknown emails,
  a reset signs out every older session (`passwordChangedAt`). Without the key, development prints
  the link in the API console.
- **Landing page** (`app/(site)/page.tsx`): hero with a drawn test-screen preview, format facts,
  features, test format, how it works, pricing teaser, closing call to action. Only true, fixed
  figures (98 questions, 2h 14m, 400–1600); no invented student numbers.
- **Delete** drills, mocks and full tests from their cards (with confirmation).
- **Pricing is editable** in Admin → Settings (plan names, PKR/USD prices, periods, saving badges,
  points, most popular, comparison rows, the lines under them and a **refund policy** line, default
  "All payments are final: SAT Sharks does not offer refunds."). Stored as setting `pricing`;
  the pricing page reads `GET /api/pricing`. The four plan ids are fixed (accounts store them).
- **Login / sign-up / forgot / reset pages** redesigned (split brand panel, inline validation,
  password show/hide, loading states). **Pricing** (proposal pp. 9–10, PKR/USD switch),
  **Terms** and **Privacy** pages (factual, not legally reviewed), site footer, phone menu.
- **Question bank: 9,927 questions** (2,207 Math, 7,720 Reading & Writing) in **41 papers**, one per
  exam source and section. Every question has a correct answer, a topic and a skill.
  **All 41 papers are published** (visible to students).
- **201 question images** copied from the source into our MongoDB `assets` collection and served
  at `/api/assets/<key>`. No question points at the source's servers.
- **Practice drills:** pick exam, section, domains, skills, difficulty, count, timer, exclude
  answered; Bluebook-style test screen; per-question "Check"; results and review.
- **Adaptive mocks:** one section in two modules. Math 22+22 (35 min each), Reading & Writing 27+27
  (32 min each). Module 2 is built on the server after Module 1 is submitted: harder if Module 1
  correct ≥ ⌈size × threshold⌉, otherwise easier. Threshold **65%** (15/22 Math, 18/27 R&W), an
  admin setting. Modules are spread across skills; harder Module 2 prefers hard-tagged questions,
  easier prefers easy-tagged; no repeats; each module has its own server clock; a submitted
  module cannot be reopened. Results show per-module scores and the route.
- **Full test:** Reading & Writing mock → 10-minute break (skippable, auto-continues if the page is
  open) → Math mock (`fulltests` collection; Math created only when the break ends).
- **Extended time** 1.5× / 2× chosen when starting a mock or full test (multiplies every module).
- **Time tracking** on the server: per question (between question loads), per module and per
  attempt. **Scaled scores**: 200–800 per section from admin-entered conversion tables (one per
  section × Module 2 route), total 400–1600 = sum. Logic only in `apps/api/src/services/scoring.ts`.
  **No tables are entered yet**, so students see "score pending".
- **Results page:** section/total score, correct/incorrect/skipped and time per module, time per
  question, report a problem from the review.
- **Report a problem** on every question (test screen and review); admin queue with the question
  editor beside the report, resolve/reopen with history and an "also resolve the others" option.
- **Test screen tools:** timer (hide/show), directions, mark for review, cross-out (ABC),
  question navigator, **Desmos calculator** in a floating draggable/resizable window
  (`desmos.com/testing/collegeboard/graphing` in an iframe), **reference sheet** in a floating
  draggable window (from Umair's other project; see §6).
- **Admin** (sidebar: Dashboard, Papers, Questions, Reports, Settings; tab strip on phones):
  stats incl. users by region and pending reports, publish/hide per paper and in bulk, question
  bank with filters/search/paging, question editor (shared component `question-editor.tsx`) with
  live preview, delete, adaptive threshold, conversion tables, problem-report queue.
- **Uploaded practice tests (full-test PDF upload)** — see `docs/full-test-upload.md`. Admin → Full
  tests: upload an English and a Math PDF (Module 1, 2 Easy, 2 Hard each) in a strict text format,
  checked during the upload; review screen with live preview and the same rules as the server;
  publish (two hidden papers, questions tagged `full-test`); add images; activate. Students see
  "Full-Length Practice Tests" on Home and sit them through the normal full-test flow; Module 2
  follows the same routing rule (65%). The tagged questions never reach drills, random mocks or
  the catalog. Math may be LaTeX in `$…$` (like the bank) or plain text (the other site's style,
  converted); CATEGORY is a bank domain or skill, or one of the other site's category names.
- **Question editor** (bank, reports, uploaded tests): image drag-and-drop upload (PNG/JPEG/WebP,
  stored in `assets`), editable choices with Set/Correct, question-type switch (Math), Math symbol
  bar and a visual equation editor (MathLive), live preview including the explanation.
- Rendering: LaTeX (KaTeX, Math only), tables, bar/line charts, right triangles, images,
  `**bold**`, `*italic*`, `__underline__`, bullets, blanks, `{viz}` figure placement.
- Fonts Roboto (interface) and Noto Serif (question text) via `next/font`. Page container up to
  1700px wide, 16px/32px side padding — measured from the reference site's stylesheet.

### Not built yet

- Conversion-table **values** (SAT Sharks to supply; the admin editor is ready). Per-paper tables
  wait for "build a paper" (mocks mix exams, so tables are per section and route for now).
- Google sign-in, the plan half of the user types (free/paid), payments, free-plan limits.
- Refund page; landing page content; a legal contact address on Terms/Privacy.
- AI extraction from free-form PDFs (proposal Checkpoint 1.2). Only the strict-format test upload
  exists. Building papers from approved bank questions.
- Highlighter/notes, line reader (Checkpoint 2.1). Re-grading old attempts after an answer key is fixed.
- Favicon.
- Deployment (Vercel + Railway). Nothing is deployed.

### Last verified

- **Uploaded practice tests (2026-10-07):** typecheck clean; 46 unit tests (32 API incl. 11 new
  parser/rule tests, 14 worker); **13 end-to-end checks** against a throwaway in-memory MongoDB
  (`mongodb-memory-server`; Atlas never touched): input validation, both PDFs read with exact
  counts, formulas/money/paragraphs/grid-ins kept, wrong-section/broken/unknown-category/bad-LaTeX/
  bare-dollar PDFs rejected with reasons, review validation, publish, exclusion from catalog/drills/
  random mocks/bulk publish, activation guard, a student routed R&W hard (27/27) and Math easy
  (11/22 < 15) with grid-ins graded, question edit with image and type change, deactivate/delete.
  All the port kit's sample and demo PDFs and our own (incl. 1.5 and double spacing) parse with no
  errors. Browser click-through (Chrome, test API on 4100 + web on 3100 against that database):
  upload, failed section, re-upload, review with a flagged question, symbol bar, visual editor,
  publish, activate, image upload, phone layouts (no overflow), a student starting the test. Only
  console errors: the existing 401 session check and missing favicon on /login.
  **Not tested:** real client PDFs (none yet), Word/Google Docs exports, `next build`.

- **Phase 2 (2026-10-03):** typecheck clean; 35 unit tests (21 API, 14 worker); **82 end-to-end
  checks** against the real database on a second API instance (port 4100): sign-up/region, the
  whole reset flow (expired, reused, malformed tokens, old sessions signed out), extended time,
  per-question and per-module timing, timer expiry, reports (duplicates, other users, closed
  modules), scoring from tables, full test incl. two simultaneous "continue" calls, admin
  report resolve (double click) / reopen. Headless Chrome screenshots of every page at 390px and
  1440px: no horizontal overflow; one hydration error (country names) found and fixed. Test
  accounts, data and the temporary conversion table were removed; the one edited question was
  restored. **Not tested:** a real Resend send (no key here), `next build`.
- Before the reference-sheet and calculator changes: typecheck clean; 27 unit tests pass
  (14 worker, 13 API); 32 end-to-end mock checks and 67 earlier drill/admin checks passed against
  the real database; screens reviewed from headless-browser screenshots.
- **The reference sheet (black figures, drawn square roots, moved labels) and the floating
  calculator were NOT tested in the app** — Umair asked for changes without testing. Only the type
  check was run. Check them in a Math drill or mock.

## 3. Git state

- `main` (newest first): `41f2bef` user management in admin (Umair), `8354da1` Phase 2 (Umair),
  `40120f4` nav sign-in/out fix, `777eba9` login/port fix, fonts, adaptive mocks, reference sheet,
  calculator; below: `d61bff3`, `aff4a62` (Umair) and `73b574d` (Phase 1 commit by Claude).
- **Uncommitted locally:** the uploaded-practice-test work of 2026-10-07 (see the change log) and
  this file. Ask before committing or pushing.
- `docs/prompts/` (untracked) holds the phase briefs and the port kit from the other site
  (`full-test-port-kit/`, with its code and demo PDFs). Not committed so far; ask Umair.
- `docs/references/reference sheet/ReferenceSheet.tsx` is Umair's source file (untracked).
- Never commit: `.env`, `data/`, `*.har` (except `docs/references/network/bluecorn.org.har`, which
  has no tokens), `docs/purposal/`. All are in `.gitignore`.

## 4. How to run

```bash
npm install
# .env at the repo root (never .env.example): MONGODB_URI, JWT_SECRET, PORT=4000, CLIENT_URL,
# API_URL, SOURCE_API_KEY, SOURCE_ACCESS_TOKEN, RESEND_API_KEY, RESEND_FROM_EMAIL (see .env.example)
npm run dev:api     # http://localhost:4000/api/health
npm run dev:web     # http://localhost:3000 (pinned to 3000)
npm run typecheck
npm test
# Uploaded tests end to end (in-memory MongoDB, never Atlas):
node apps/api/test/e2e/make-test-pdfs.mjs <dir>
npx tsx apps/api/test/e2e/test-uploads.e2e.ts <dir>          # add --serve 4100 to keep it running
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run create:admin -- --email <e> --name "<n>" [--role admin\|staff]` | Create/promote an admin. Password from env `ADMIN_PASSWORD` |
| `npm run collect:bank -- --list` | List the source's exam sources and sizes (needs `SOURCE_ACCESS_TOKEN`) |
| `npm run collect:bank -- --exam <id> --section math\|rw` | Collect one bank and import it as Draft |
| `npm run collect:bank -- --all [--section math\|rw]` | Collect every bank; cached ones cost no requests |
| `npm run assets:copy` | Copy question images into our storage. **Run after any `collect:bank`** (re-import resets image links) |
| `npm run scrape:paper -- <file.har> [--dry-run]` | Import one attempt from a HAR recording (the first proof of concept) |
| `npm run observe:mock -- --answers none\|key` | Take one source mock and record it to `data/mock-observations/` (needs token) |

## 5. Architecture (where things are)

npm workspaces monorepo, TypeScript everywhere, run with `tsx` (no build step for API/worker).

| Path | Contents |
| --- | --- |
| `apps/web` | Next.js 15 App Router, Tailwind 4, TanStack Query. `src/app/(site)/…` pages with the nav bar; `src/app/(test)/practice/[id]` full-screen test screen |
| `apps/web/src/components` | `question.tsx` (passage/prompt/choices/answer box), `viz.tsx` (tables/charts/triangles), `create-drill.tsx`, `create-mock.tsx`, `draggable-panel.tsx`, `reference-sheet.tsx`, `attempt-card.tsx` (+ full-test card), `nav.tsx`, `footer.tsx`, `ui.tsx`, `auth-ui.tsx` / `auth-form.tsx`, `admin-sidebar.tsx`, `question-editor.tsx`, `report-ui.tsx`, `legal-page.tsx` |
| `apps/web/src/lib` | `api.ts` (fetch wrapper), `auth.ts` (session hooks), `rich-text.tsx` (markup + KaTeX) |
| `apps/api/src` | Express 5: `routes/`, `controllers/`, `services/` (`practice.service.ts` drills + mocks, `mock-assembly.ts` module builder, `settings.service.ts`, `admin.service.ts`, `auth.service.ts`, `email.service.ts` (Resend), `scoring.ts` (all scaled scores), `report.service.ts`), `middleware/`, `utils/grading.ts` |
| `apps/worker/src` | Import pipelines: `scrapers/source/bluecorn/*` (HAR reader, API client, bank collector, parsers), `scrapers/normalizers`, `scrapers/validators`, `services/`, `cli/*` |
| `packages/types` | Shared enums, DTOs, role→permission map, `MOCK_FORMAT`, default threshold |
| `packages/validation` | Zod schemas |
| `packages/db` | Mongoose models: User, Paper, Question, Asset, Attempt, Setting; `connectMongo`, `trusted` |
| `packages/config`, `packages/utils` | Env loading; logger and helpers |
| Uploaded tests | `apps/api/src/services/test-upload.service.ts`, `test-upload-parser.ts`, `pdf-text.ts`; `packages/db/.../test-upload.model.ts`; web `app/(site)/admin/tests/**`, `components/question-form.tsx`, `math-input.tsx`, `practice-tests.tsx`, `test-upload-ui.tsx`; `public/full-test/` (format guide, builder, samples); `public/mathlive/fonts` |
| `docs/` | `full-test-upload.md`, `architecture.md`, `database.md`, `api.md`, `scraping.md`, `adaptive-testing.md`, `security.md`, `performance.md`, `phase-1-completion.md`, this file |

Web calls go to its own origin; `next.config.ts` rewrites `/api/*` to `API_URL`
(`http://localhost:4000`), so the auth cookie is first-party.

## 6. Decisions made by Umair (do not re-ask)

| Date | Decision |
| --- | --- |
| 2026-10-02 | Use MongoDB Atlas (database `satsharks`). URI lives only in `.env` |
| 2026-10-02 | Import from the reference site rather than client PDFs (content-ownership risk was raised and left to the client) |
| 2026-10-02 | Collect via Umair's own session token (`SOURCE_ACCESS_TOKEN`), not manual HARs. Math first, then Reading & Writing — both done |
| 2026-10-02 | Push everything to `main`; the repository stays public (proposal PDF kept out) |
| 2026-10-03 | SAT Sharks keeps its branding; copy the reference's fonts and side spacing |
| 2026-10-03 | Build adaptive mocks. Observe 2 source mocks (done). Routing threshold **65%** |
| 2026-10-03 | Math difficulty "learn from the mocks" was chosen, but the mocks showed the source tags every Math question easy, even in its hard module — so nothing was relabelled (see §7) |
| 2026-10-03 | Reference sheet: use Umair's own component from his other project (`docs/references/reference sheet/ReferenceSheet.tsx`), figures black, movable window, readable square roots, top 30°/45° labels lower, cylinder "r" higher |
| 2026-10-03 | Calculator: floating, draggable window like the reference site's, not a new tab |
| 2026-10-03 | For UI-only changes Umair may say "do not test" — then only typecheck, no login/browser runs |
| 2026-10-03 | Admin/staff accounts do not practise: they land on `/admin`, the nav shows only "Admin Portal", and student pages redirect them there (UI only; the API does not block them) |
| 2026-10-03 | Students can delete their own drills, mocks and full tests (a full test is deleted as a whole) |
| 2026-10-03 | The admin account's login is now `admin2.0@gmail.com` (same account, role and history; display name "SAT Sharks Admin"). Umair set the password; it is not stored in the repo |
| 2026-10-03 | Keep testing light unless asked: typecheck plus a few targeted checks |
| 2026-10-07 | Port the other site's full-test PDF upload; Umair left the design to Claude ("do what is best for this web"). Chosen: two papers per test + fixed-module mode in the mock engine; Math in LaTeX `$…$` like the bank; CATEGORY = bank domain or skill; students take uploaded tests as full tests only; test against an in-memory MongoDB, never Atlas |
| 2026-10-07 | The admin question editor must work like the other site's: image upload, symbol bar, visual equation editor, editable choices with Set/Correct, question type |

## 7. Facts about the source (verified)

- React SPA on Supabase. All data via `POST https://ciao.bluebooky.org/rest/v1/rpc/<fn>` with
  headers `apikey` (publishable anon key) and `Authorization: Bearer <user access token>`.
  Login is captcha-protected; we never automate login. Access tokens last **1 hour**; copy from
  Chrome DevTools → Application → Local Storage → `sb-ciao-auth-token` → `access_token`.
- Drill flow: `pFilter` (returns question IDs, creates nothing) → `pStart` → `pGet`/`pAnswer` →
  `pEnd` → `rpGetResult` (returns **every** question with answers, opened or not).
- Labels come from filters: one `pFilter` per domain, skill and difficulty (`easy`/`hard`; no medium).
- **Math difficulty is unusable at the source:** 2,139 easy, 68 hard (only March 14, 2026 has a real
  split). Reading & Writing is real: 4,739 easy, 2,981 hard.
- 23 questions have a skill filed under the wrong domain (so a skill can appear under two domains —
  de-duplicate skill lists in the UI). One R&W question (ID 1506) is in two exam sources.
- Mock flow: `mStart` → `mGetAttempt` → `mGet` → `mAnswer` → `mEndModule1` (sends only the attempt
  ID; returns `m2_type`, `m1_correct`, `m2_start_pos`) → `mEnd` → `mrGetResult`. Math modules 22
  questions, 35 minutes; Module 2 numbering restarts at 1. 0 correct → `m2_easy`; 22/22 → `m2_hard`;
  threshold unknown. Each module covers ~19 skills from ~10 exams. Details: `docs/adaptive-testing.md`.
- The source embeds `**[bluebooky.com]**` in 537 chart titles/labels; it is stored and displayed
  as received (client decision pending).
- Calculator on the source: iframe of `https://www.desmos.com/testing/collegeboard/graphing` in a
  640×520 draggable, resizable panel with a drag overlay.
- Answers are sent to the source as the choice's **text** (MCQ) or the typed value (SPR).

## 8. Traps already hit (save time)

- **`.env` vs `.env.example`:** Umair has twice pasted secrets into `.env.example` (committed!).
  Always check, move secrets to `.env`, blank the template.
- **HAR files contain session tokens** in response bodies even when exported "sanitized". `*.har`
  is git-ignored for that reason.
- **Mongoose `sanitizeFilter` is on:** operators like `$in`/`$exists` in `find()` filters are
  rejected unless wrapped in `trusted()` (from `@satsharks/db`). Aggregation pipelines are not
  sanitized. One-off scripts hit this often.
- **PowerShell drops `--`** when calling npm scripts: `npm run x -- --flag` loses the flags. Call
  the CLI directly: `npx tsx apps/api/src/cli/create-admin.ts --email … --role admin`.
- **PowerShell safety check** misreads regexes or here-strings containing `/` as paths and blocks
  `Remove-Item`. Write scripts with the Write tool, run and delete them in separate steps.
- **The Bash tool has at times lost `node`, `sed`, `grep`, `curl`** from its PATH. Use PowerShell or
  the Edit/Grep tools.
- **Background dev servers started by Claude are killed** when the session's background time limit
  is reached. Umair should run `npm run dev:api` / `dev:web` in his own terminals.
- **Port clash (fixed):** Next once started on 4000 and proxied to itself ("socket hang up"). Web is
  now pinned to 3000 and the API opens its port before connecting to MongoDB, failing loudly on
  `EADDRINUSE`.
- **Stale session in the menu (fixed):** switching accounts in another tab left the Admin button
  visible. Sign-in clears cached data; the session is re-checked on tab focus; 4xx are not retried.
- **Never `queryClient.clear()` (or remove the `["auth","me"]` query) on sign-in/out.** The nav sits
  in the `(site)` layout, which does not re-render on navigation; its observer stays on the removed
  query and keeps showing the old account (Admin/Sign Out after logout, Log In/Sign Up after login).
  `useSwitchUser` removes every *other* query and updates "me" in place.
- **Atlas first connection can exceed 10 s** from this machine; timeout is 30 s.
- **Testing against Umair's running dev servers:** the API's dev reset link prints in *his*
  console. Start a second API with `PORT=4100` (same database) and capture its output; PowerShell
  wraps long stderr lines, so join lines before searching the log.
- **Auth rate limit** (20 per 15 min per IP, in memory) trips repeated test runs: restart the test
  API instance between runs.
- **Headless screenshots** of a tab that is not in front hang: call `page.bringToFront()` first.
  Type into forms only after `networkidle0` (+ a moment), or the form submits before hydration.
- **Anything built from `Intl` locale data** (country names) differs between Node and Chrome and
  breaks hydration: build it after mount.
- **Bash heredocs with long Python** sometimes fail to parse in this tool; write the script with the
  Write tool and run it.
- **Next.js page files** may only export the page and its config; shared constants go in components.
- **Never `networkidle0` as the only wait on a page Next has not compiled yet**: the first dev compile
  can exceed 2 minutes. Use `load` plus a fixed wait.
- **pdf-parse drops blank lines**, so paragraphs merge; `pdf-text.ts` rebuilds lines from pdf.js
  positions instead. Keep it if the extractor is ever swapped.
- **`$\$78$` in Math** was cut wrongly by the old renderer regex (91 bank questions with money
  showed garbled). Fixed in `rich-text.tsx`; formulas may contain escaped characters.
- **mongodb-memory-server's first start** on this machine took over 10 s (binary scan): the e2e
  sets a 120 s launch timeout.
- **Never run a second `next dev` in `apps/web` on the same build folder.** Claude's test web
  server (port 3100) shared `.next` with Umair's server on 3000 and broke it (ChunkLoadError on
  /admin/tests, 2026-10-08). Test servers now use `NEXT_DIST_DIR=.next-test`
  (`API_URL=http://localhost:4100 NEXT_DIST_DIR=.next-test npx next dev -p 3100`); fix a broken
  server by stopping it, deleting `apps/web/.next` and starting it again.
- **Puppeteer clicks** can land on the review page's floating save bar; scroll the field to the
  centre first.
- Auto mode once blocked reading local web files right after a read-only Atlas query, labelling it
  "production reads". Avoid querying Atlas during a session; use the local cache in `data/`.
- Testing in the app needs an account. Use temporary accounts `phase1-test-*@example.com`
  (create with `create:admin` or `/api/auth/register`) and delete them afterwards. Never use or
  change Umair's own accounts.

## 9. Open items and suggestions

0. **Try the upload with the client's real PDFs** (Admin → Full tests). They must follow the format
   (`/full-test/format.html`). PDFs made for the other SAT Sharks site upload unchanged (its
   category names and plain-text Math are accepted). Word/Google Docs exports are untested.

1. Umair to check the reference sheet and the floating calculator in the app (untested).
2. Commit and push the uncommitted work when Umair says so.
3. Client decisions pending: use of the reference site's content; the embedded "[bluebooky.com]"
   strings; the adaptive threshold (65% is a placeholder); Math difficulty source.
4. Scaled scores need SAT Sharks' conversion tables (enter in Admin → Settings), and Umair's
   Resend values in `.env`. Terms/Privacy need legal review and a contact email
   (`LEGAL_CONTACT_EMAIL` in `apps/web/src/components/legal-page.tsx`). Pricing is set in Admin →
   Settings (defaults: the proposal's "starting suggestion", `DEFAULT_PRICING` in packages/types).
   The Terms page still says refund terms "will be published"; it should match the no-refund line.
5. Remaining proposal items (§2 "Not built yet"), then deployment.

## 10. Change log

Newest last. One entry per session or major step.

- **2026-10-02 — Phase 1 investigation.** Read proposal, screenshots and the first HAR (a drill).
  Found the Supabase RPC API, captcha-protected login, no fixed papers, server-side routing.
- **2026-10-02 — Foundation.** Monorepo, Express API with auth/permissions, Mongoose models,
  Next.js shell, worker with HAR import pipeline, docs. Atlas connected; admin account created.
- **2026-10-02 — First import.** 50-question drill from Umair's recorded HAR imported and verified
  idempotent (later deleted as redundant).
- **2026-10-02 — Token mode.** Built `collect:bank` (labels via filters, content via drill results,
  cached and resumable). Collected all Math (15 banks, 2,207) then all R&W (26 banks, 7,720).
- **2026-10-03 — Images and app.** `assets:copy` (201 SVGs into MongoDB). Drill engine, Bluebook-style
  test screen, results, admin question bank and editor, renderers. Pushed to `main` as `73b574d`
  (proposal PDF excluded).
- **2026-10-03 — Fixes.** Duplicate skill keys; login "socket hang up" (port pinning, API listens
  first); Admin button for students (session refresh); Roboto/Noto Serif fonts; 1700px layout.
- **2026-10-03 — Adaptive mocks.** Observed two source mocks with Umair's token. Built the mock
  engine (module builder, routing, per-module clocks, locking), API (`/api/practice/mocks`,
  `/attempts/:id/submit-module`, `/api/admin/settings/adaptive`), start dialog, test-screen module
  handling, results per module, admin threshold card. 32 end-to-end checks passed. Test-screen
  directions rewritten in our own words.
- **2026-10-03 — Reference sheet.** Replaced the text-only sheet with Umair's component; black
  figures, drawn square roots, adjusted labels; opens in a floating draggable window. Not tested in app.
- **2026-10-03 — Calculator.** Desmos now opens in a floating, draggable, resizable window instead
  of a new tab. Not tested in app.
- **2026-10-03 — This file** (`docs/project-context.md`) and `CLAUDE.md` created.
- **2026-10-03 — Nav after sign-in/out.** Nav kept showing the previous account's buttons until a
  reload: `useSwitchUser` called `queryClient.clear()`, orphaning the nav's "me" observer. Now it
  removes other queries and updates "me" in place (`isMeQuery` shared with `providers.tsx`). Home
  page buttons moved to `components/home-actions.tsx`: signed-in visitors see "Go to your
  dashboard" instead of "Create a free account / Log in". Type check only; not tested in app.
- **2026-10-03 — Hydration warning on `<body>`** seen on a friend's browser: an extension adds a
  `__processed_…__` attribute before React loads. Harmless, dev-only; no code change made.
- **2026-10-03 — Phase 2.** Inspected the proposal (Checkpoint 2.2, pricing, user types) and the
  code first; nothing below existed. Added: country/region at sign-up; forgot/reset password via
  Resend (hashed single-use 30-min tokens, old sessions revoked); redesigned auth pages; pricing,
  terms, privacy, footer, phone nav; admin sidebar layout with Papers and Settings split out;
  extended time; server-side question/module/attempt timing; conversion tables + centralised
  scoring + full test (R&W, break, Math) with 400–1600 total; results page breakdown; report a
  problem + admin queue with in-place question editing and resolve/reopen history; mobile layout
  fixes (test screen stacks and scrolls on phones, tables collapse columns, admin tab strip).
  New collections `fulltests`, `problemreports`; new fields on users and attempts; permissions
  `reports:read` (staff) / `reports:write` (admin). Tested as in §2 "Last verified".
- **2026-10-03 — Delete, admin-only portal, admin login, landing page.** `DELETE` routes for
  attempts and full tests + delete buttons on cards. Admin/staff: login goes to `/admin`, nav shows
  only "Admin Portal", student pages redirect (`RequireUser studentOnly`, `homePath`). Admin account
  email changed to `admin2.0@gmail.com` with Umair's new password (old sessions signed out).
  Landing page rebuilt. Light tests: typecheck; 6 API checks (admin login, old email gone, delete
  own/others', full-test section refused, full test removes sections); admin redirect and nav
  checked in Chrome; landing page at 390/1440px with no overflow or errors. Test users removed.
- **2026-10-03 — Landing page revisions (Umair).** Stats strip now shows the bank (9,900+ questions,
  26 past exams, 29 skills across 8 topics, 400–1600), counted from the database. Removed the
  "Bluebook style" badge, the pricing teaser and every "explained" claim: **no question has an
  explanation yet (0 of 9,927)**, so neither the landing page nor the sign-in panel may say so.
  Added a Practice drill tile beside the adaptive mock (R&W, 10-minute break, Math). Typecheck +
  screenshot at 390/1440px (no overflow, no errors).
- **2026-10-03 — Hero alignment.** Landing hero text block lifted ~24px on wide screens (`lg:pb-12` on the
  centred text column) so it lines up with the test-screen picture; spacing inside unchanged.
- **2026-10-07 — Uploaded practice tests (full-test PDF upload) and question editor.** Ported the
  other SAT Sharks site's feature from `docs/prompts/full-test-port-kit/`, adapted to this site's
  generated mocks: `testuploads` collection; upload/review/publish/activate API and admin screens
  (Full tests in the sidebar); publish creates two hidden papers with `full-test`-tagged questions;
  fixed-module mode in the mock engine (`fixedModule`, `MockSource`), routing unchanged; student
  "Full-Length Practice Tests" on Home; exclusions in catalog, drills, mock pool, Papers list and
  bulk status. PDF text via pdf.js with paragraph-gap detection; parser re-joins wrapped lines in
  both sections; Math in LaTeX with KaTeX checks; grid-in values must be typeable. Question editor:
  image upload (`POST /api/admin/assets`), choices, type switch, symbol bar, MathLive visual
  editor. Fixed the renderer's `$\$…$` bug. Format guide, printable builder and sample PDFs in
  `apps/web/public/full-test/`. New deps: `pdfjs-dist`, `multer`, `katex` (API), `mathlive` (web),
  `mongodb-memory-server` (API dev). Tested as in §2 "Last verified". The kit's two §5 fixes did
  not apply here (no `UPDATED` status; the Papers list never loaded questions).
- **2026-10-07 — The other site's PDFs.** Umair uploaded the other site's demo PDFs and every
  question was rejected (its "SAT …" categories; plain-text Math with bare `$90`). Now accepted:
  category aliases to our domains, English skill inferred from the prompt wording, and plain-text
  Math detected per file and converted (`$` kept as `\$`, powers → superscripts). The renderer
  shows `\$` outside a formula as `$` and never opens a formula at an escaped `$`. Unknown
  categories are reported once per name. Tests: 14 parser tests, 14 end-to-end checks including
  both of the other site's demo PDFs (extracted with no errors, saved through review unchanged).
- **2026-10-07 — Home order (Umair).** Home now shows: the two start cards, Active Drills & Mocks
  (an uploaded test in progress appears here as a full-test card), Exams, then Full-Length
  Practice Tests at the bottom. Typecheck only.
- **2026-10-08 — Editable pricing, refund line, sign-in/out fixes.** Pricing moved from
  `lib/pricing.ts` constants to the `pricing` setting with an editor card in Admin → Settings
  (`components/pricing-settings.tsx`), `GET /api/pricing` (public) and `GET/PUT
  /api/admin/settings/pricing`; a refund-policy line shows under the plans. Sign-in: the form is
  replaced at once by "Opening …" (the nav no longer shows the account over the login form) and the
  destination is prefetched; `?next=` is only used when it suits the account (`nextPathFor`).
  Sign-out from a protected page no longer opens the login form with `?next=` that page (the
  cause of a student landing on /admin/settings). `RequireUser` sends an account that may not
  open a page to its own home instead of "You do not have access". Checked in Chrome against the
  in-memory test API: all of the above, plus the price change reaching /pricing.
