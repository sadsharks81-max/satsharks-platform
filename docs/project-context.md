# SAT Sharks — project context and work log

**Read this first when starting a new session.** It records what exists, why, what was decided,
what is half-done, and the traps already found. Keep it up to date: every session that changes the
project adds to the change log at the bottom and corrects anything above that is no longer true.

Last updated: 2026-10-03.

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

## 2. Current state (2026-10-03)

### Working

- Accounts: register, login, logout, session (`/api/auth/*`), roles `student` / `staff` / `admin`
  with permission checks. Admins are created with `npm run create:admin` (not by registration).
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
- **Test screen tools:** timer (hide/show), directions, mark for review, cross-out (ABC),
  question navigator, **Desmos calculator** in a floating draggable/resizable window
  (`desmos.com/testing/collegeboard/graphing` in an iframe), **reference sheet** in a floating
  draggable window (from Umair's other project; see §6).
- **Admin:** stats, publish/hide per paper and in bulk, question bank with filters/search/paging,
  question editor (difficulty, topic, skill, text, answer, explanation) with live preview, delete,
  adaptive threshold setting.
- Rendering: LaTeX (KaTeX, Math only), tables, bar/line charts, right triangles, images,
  `**bold**`, `*italic*`, `__underline__`, bullets, blanks, `{viz}` figure placement.
- Fonts Roboto (interface) and Noto Serif (question text) via `next/font`. Page container up to
  1700px wide, 16px/32px side padding — measured from the reference site's stylesheet.

### Not built yet

- 400–1600 scaled scores (needs SAT Sharks' conversion tables).
- Full test in one sitting (both sections, the break between them); extended time.
- Password reset, Google sign-in, email service, the five user types (region/plan), payments.
- Public pages: landing content, pricing, terms, privacy, refund.
- PDF upload with AI extraction (proposal Checkpoint 1.2), building papers from approved questions.
- Highlighter/notes, line reader, "report a problem".
- Deployment (Vercel + Railway). Nothing is deployed.

### Last verified

- Before the reference-sheet and calculator changes: typecheck clean; 27 unit tests pass
  (14 worker, 13 API); 32 end-to-end mock checks and 67 earlier drill/admin checks passed against
  the real database; screens reviewed from headless-browser screenshots.
- **The reference sheet (black figures, drawn square roots, moved labels) and the floating
  calculator were NOT tested in the app** — Umair asked for changes without testing. Only the type
  check was run. Check them in a Math drill or mock.

## 3. Git state

- `main` on GitHub: `d61bff3` ("file deleted", Umair) on top of `aff4a62` ("error resolved",
  Umair) and `73b574d` (Phase 1 commit by Claude).
- **Uncommitted locally:** the login/port fix, Admin-button/session fix, fonts and spacing, adaptive
  mocks (engine, API, screens, settings), reference sheet, floating calculator, and this file.
  Umair has not yet said to commit them. Ask before committing or pushing.
- `docs/references/reference sheet/ReferenceSheet.tsx` is Umair's source file (untracked).
- Never commit: `.env`, `data/`, `*.har` (except `docs/references/network/bluecorn.org.har`, which
  has no tokens), `docs/purposal/`. All are in `.gitignore`.

## 4. How to run

```bash
npm install
# .env at the repo root (never .env.example): MONGODB_URI, JWT_SECRET, PORT=4000, CLIENT_URL,
# API_URL, SOURCE_API_KEY, SOURCE_ACCESS_TOKEN (see .env.example)
npm run dev:api     # http://localhost:4000/api/health
npm run dev:web     # http://localhost:3000 (pinned to 3000)
npm run typecheck
npm test
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
| `apps/web/src/components` | `question.tsx` (passage/prompt/choices/answer box), `viz.tsx` (tables/charts/triangles), `create-drill.tsx`, `create-mock.tsx`, `draggable-panel.tsx`, `reference-sheet.tsx`, `attempt-card.tsx`, `nav.tsx`, `ui.tsx` |
| `apps/web/src/lib` | `api.ts` (fetch wrapper), `auth.ts` (session hooks), `rich-text.tsx` (markup + KaTeX) |
| `apps/api/src` | Express 5: `routes/`, `controllers/`, `services/` (`practice.service.ts` drills + mocks, `mock-assembly.ts` module builder, `settings.service.ts`, `admin.service.ts`, `auth.service.ts`), `middleware/`, `utils/grading.ts` |
| `apps/worker/src` | Import pipelines: `scrapers/source/bluecorn/*` (HAR reader, API client, bank collector, parsers), `scrapers/normalizers`, `scrapers/validators`, `services/`, `cli/*` |
| `packages/types` | Shared enums, DTOs, role→permission map, `MOCK_FORMAT`, default threshold |
| `packages/validation` | Zod schemas |
| `packages/db` | Mongoose models: User, Paper, Question, Asset, Attempt, Setting; `connectMongo`, `trusted` |
| `packages/config`, `packages/utils` | Env loading; logger and helpers |
| `docs/` | `architecture.md`, `database.md`, `api.md`, `scraping.md`, `adaptive-testing.md`, `security.md`, `performance.md`, `phase-1-completion.md`, this file |

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
- **Atlas first connection can exceed 10 s** from this machine; timeout is 30 s.
- Testing in the app needs an account. Use temporary accounts `phase1-test-*@example.com`
  (create with `create:admin` or `/api/auth/register`) and delete them afterwards. Never use or
  change Umair's own accounts.

## 9. Open items and suggestions

1. Umair to check the reference sheet and the floating calculator in the app (untested).
2. Commit and push the uncommitted work when Umair says so.
3. Client decisions pending: use of the reference site's content; the embedded "[bluebooky.com]"
   strings; the adaptive threshold (65% is a placeholder); Math difficulty source.
4. Scaled scores need SAT Sharks' conversion tables.
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
