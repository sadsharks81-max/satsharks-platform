# Scraping / import

Source investigated: `https://bluecorn.org` (API host `ciao.bluebooky.org`).

## Status

- The pipeline runs end to end on a real recording: **50 of 50 questions extracted, normalized
  and validated, all with correct answers.**
- The set is stored in MongoDB as a Draft paper. A second run inserted nothing and matched all 50.
- The recording is a **practice drill**, not an adaptive mock. It proves the question pipeline.
  It contains no module or adaptive data (see [adaptive-testing.md](adaptive-testing.md)).

## Paper tested

| | |
| --- | --- |
| Recording | `docs/references/network/mathmodule.org.har` (205 requests) |
| Kind | Practice drill |
| Attempt ID (`sourcePaperId`) | `2ae473f6-21a0-4e6d-9a3c-d1350d79ef58` |
| Exam source | SAT June 06, 2026 Administration (source ID 22) |
| Section | Math |
| Filter used | All four domains, all difficulties, limit 50 |
| Questions | 50: 40 multiple-choice, 10 student-produced response |
| With correct answer | 50 |
| With an image | 5 |
| With chart/table data | 3 questions, plus 2 whose answer choices are tables |
| With explanation | 0 |
| With difficulty, topic or skill | 0 |

Title given to the paper: "SAT June 06, 2026 Administration — Math — question set (50)".

## Source investigation

Evidence: two recordings in `docs/references/network/`, the JavaScript bundle inside them, and
the screenshots in `docs/references/screenshots/`.

### Observed

- The site is a React single-page app. All data comes from a Supabase backend through
  `POST https://ciao.bluebooky.org/rest/v1/rpc/<function>` with a JSON body.
- All content requires a signed-in account. The login form carries a Cloudflare Turnstile captcha.
- Functions the app calls (names read from the bundle; drill calls also seen in recordings):

| Area | Functions |
| --- | --- |
| Catalogue | `getQsMetadata`, `getCounts`, `getNextExam`, `getAnnouncements`, `getStatus` |
| Drill | `pFilter`, `pStart`, `pGetAttempt`, `pGet`, `pAnswer`, `pCheckQuestion`, `pEnd`, `pListAttempts`, `rpGetResult` |
| Adaptive mock | `mStart`, `mGetAttempt`, `mGet`, `mAnswer`, `mEndModule1`, `mEnd`, `mListAttempts`, `mrGetResult` |

- **There are no fixed papers.** The site has 26 exam sources (for example "SAT June 06, 2026
  Administration"). A drill or mock is assembled per attempt on the server.
- `getCounts` reports the bank size per exam source: **9,934 questions in total, 7,720 Reading &
  Writing and 2,207 Math.** Only 15 of the 26 exam sources have Math questions.
- `getQsMetadata` lists the exam sources and the label vocabulary: 4 Math domains, 19 Math
  skills, 4 Reading & Writing domains, 10 Reading & Writing skills.

Drill flow, as recorded:

| Call | Request | Response |
| --- | --- | --- |
| `pFilter` | `p_exam_id`, `p_section`, `p_domains`, `p_skills`, `p_difficulty`, `p_exclude_ids`, `p_limit` | Array of question IDs |
| `pStart` | `p_exam_id`, `p_question_ids`, `p_timer`, `p_t_time`, `p_name` | The new attempt ID |
| `pGetAttempt` | `p_attempt_id` | `attempt` + `navigation[]` (`seq`, `status`, `testId`, `contentId`, `flagged`) |
| `pGet` | `p_attempt_id`, `p_position` | One question, without the answer |
| `pAnswer` | answer, flag, time | `true` |
| `pCheckQuestion` | `p_attempt_id`, `p_position` | One question, with the answer |
| `pEnd` | `p_attempt_id` | Counts: correct, incorrect, unanswered |
| `rpGetResult` | `p_attempt_id` | `attempt` + **every question of the attempt, with answers** |

- **`rpGetResult` returns the full content and correct answer of every question in the drill,
  including questions the student never opened.** In the recording, 36 questions were opened and
  all 50 came back. One call therefore yields the whole question set.
- Result question fields: `id`, `content_id`, `question_id`, `position`, `section`, `type`
  (`mcq` / `grid_in`), `prompt` (LaTeX), `passage`, `options[] { text, viz_data }`, `c_answer`
  (index of the correct choice), `c_answers[]` (accepted values for grid-in), `explanation`,
  `graph_url`, `viz_data`, `image_dimensions`, plus the student's `s_answer`, `correct`,
  `answered`, `flagged`.
- Images are public URLs on the source's storage (`…supabase.co/storage/v1/object/public/images/…`).
- `viz_data` is structured chart or table data (`type: "bar"`, `type: "table"`, …), drawn by the client.

### Not provided by the source

- **Difficulty, domain and skill are not on any question.** They exist only as `pFilter` inputs.
- **Explanations:** the field exists and was `null` for all 50 questions.
- **Per-module time limits** are not part of an attempt.

### Not yet observed

No adaptive mock has been recorded. The mock response shapes are known only from the bundle.

## Getting difficulty, topic and skill

Because the labels are filter inputs, a drill created with a filter that pins one value tells us
that value for every question in it. The importer applies this: a drill filtered to exactly one
domain sets `topic`; exactly one skill sets `skill`; one difficulty sets `difficulty`. Several
values, or none, leave the field `null`.

So labelled questions need one drill per skill (19 for Math) and, for difficulty, per difficulty
level. The UI offers "Easy" and "Hard" only; the exact value the app sends for them has not been
recorded, and an unrecognised value is left `null` with a warning.

## Method

Priority order from the brief, and what applied:

1. **Structured API requests:** they exist, but calling them needs a session, and getting one
   automatically means defeating the captcha. Not done.
2. **Embedded JSON/state:** none; the HTML is an empty shell.
3. **DOM extraction / 4. Playwright:** would hit the same login.

Chosen method: **a person records a HAR while using the site, and the importer parses it.**
This gives the structured API responses of option 1 with no automated requests to the site, no
credentials in this project, and no access control bypassed.

## Live API mode (session token)

Run against the real site for three banks (2026-10-02). All are in MongoDB as Draft papers.

| Bank | Questions | With answer | Types | Difficulty at source | Requests | Drills created |
| --- | --- | --- | --- | --- | --- | --- |
| June 06, 2026 — Math (`exam-22-math`) | 186 of 186 | 186 | 138 MCQ, 48 SPR | 186 easy, 0 hard | 34 | 2 |
| March 08, 2025 — Math (`exam-24-math`) | 359 of 359 | 359 | 263 MCQ, 96 SPR | 359 easy, 0 hard | 40 | 4 |
| June 06, 2026 — Reading & Writing (`exam-22-rw`) | 241 of 241 | 241 | 241 MCQ | 136 easy, 105 hard | 28 | 3 |

Every question in all three banks has a topic and a skill, and the per-domain and per-skill
counts add up to the bank total. No explanations in any of them. Re-running an imported bank
makes no requests and inserts nothing.

**All Math collected (2026-10-02):** every one of the 15 exam sources that has Math, 2,207
questions in 15 Draft papers, no warnings. Verified in the database: 2,207 distinct source IDs
(no question appears in two exam sources), 0 without an answer, topic or skill; 1,610
multiple-choice and 597 student-produced response; 222 with an image, 136 with chart or table
data, 0 with an explanation. Topics: Algebra 798, Advanced Math 699, Geometry and Trigonometry
365, Problem-Solving and Data Analysis 345.

**Math difficulty is mostly not usable.** In 14 of the 15 Math banks the `easy` filter returns
every question and `hard` returns none, which looks like a default value at the source, not a
rating. Only March 14, 2026 has a real split (137 easy, 68 hard). Overall: 2,139 easy, 68 hard.
It is stored as received. Reading & Writing has a real split in the one bank collected, and it
varies by skill (for example Command of Evidence is 11 easy / 38 hard; Central Ideas and Details
is 18 easy / 1 hard).

**All Reading & Writing collected (2026-10-02):** all 26 exam sources, 7,720 questions in 26
Draft papers, no warnings. Verified in the database: 0 without an answer, topic, skill or
passage; all multiple-choice; 577 with chart or table data, 0 with an image, 0 with an
explanation. Difficulty is a real split here: 4,739 easy and 2,981 hard (three small 2023 banks
are all or nearly all easy). Topics: Information and Ideas 2,264, Craft and Structure 1,883,
Expression of Ideas 1,857, Standard English Conventions 1,716.

One source question (ID 1506) is listed by the source under two exam sources (March 09, 2024
and March 11, 2023), so it is stored once in each paper: 7,720 rows, 7,719 distinct questions.

**Whole bank: 9,927 questions** (2,207 Math + 7,720 Reading & Writing) in 41 Draft papers,
about 15 MB in MongoDB. The source's catalogue total of 9,934 is 7 higher than the sum of its
own per-section counts; every per-section count was matched exactly.

Reading & Writing content: passages mark underlined text with `__double underscores__`, which
the renderer will need to handle.

The `exam-22-math` paper overlaps the earlier 50-question drill paper, drawn from the same bank.

`npm run collect:bank` calls the source's API directly with a session token that the account
owner copies from their own logged-in browser. It does not log in and does not touch the captcha.
When the token expires (after one hour) it stops; running it again continues from disk.

For one exam source and section it makes:

| Step | Calls | Creates anything at the source? |
| --- | --- | --- |
| Catalogue (`getQsMetadata`, `getCounts`) | 2 | No |
| All question IDs (`pFilter`, no filter) | 1 | No |
| Labels: `pFilter` once per domain, skill and difficulty (`easy`, `hard`) | 25 for Math, 16 for Reading & Writing | No |
| Content: `pStart` → `pEnd` → `rpGetResult` per 100 questions | 3 per chunk | One finished drill per chunk in the account's history |

Requests are sequential with a 1.5 second pause (`SOURCE_REQUEST_DELAY_MS`), and back off on
429 and 5xx responses.

```bash
npm run collect:bank -- --list                                   # exam sources and sizes
npm run collect:bank -- --exam 22 --section math --dry-run       # collect, validate, no database
npm run collect:bank -- --exam 22 --section math                 # collect and import as Draft
npm run collect:bank -- --all                                    # every bank; collected ones are skipped
```

The result is one Draft paper per exam source and section, with `sourcePaperId`
`exam-<id>-<section>`, for example "SAT June 06, 2026 Administration — Math — question bank (186)".
Responses are cached in `data/collections/exam-<id>-<section>/raw/`.

Labels: `topic` and `skill` come from the domain and skill filters. `difficulty` is `easy` or
`hard` when the question matches that filter and `null` otherwise. The source has no "medium"
filter, so a `null` may be a medium question, but the source never states it.

Getting the token: in Chrome on the source site, DevTools → Application → Local Storage →
the site's origin → key `sb-ciao-auth-token` → copy the `access_token` value into
`SOURCE_ACCESS_TOKEN` in `.env`.

**HAR files can contain this token.** Chrome's "sanitized" export removes headers but keeps the
body of the token-refresh response. `*.har` is git-ignored for that reason.

## Images

`npm run assets:copy` downloads every image a question refers to (they are public files, so no
token is needed), stores it in our `assets` collection, and rewrites the question to point at
`/api/assets/<key>`. The original URL is kept as `sourceUrl`.

Run on 2026-10-03: 201 distinct SVG files, 6.96 MB, 227 question references rewritten, 0
failures. A second run found nothing left to copy.

Importing a bank again resets its image links to the source, so run `assets:copy` after
`collect:bank`.

## Content notes

- **Figure placement.** The text contains `{viz}` where a figure belongs (611 questions, 41 of
  them mid-paragraph). The web app draws the figure there.
- **Figure types.** `table` (524), `bar` (118), `line` (45), `triangle` (29), plus tables and
  line charts inside answer choices.
- **Markup.** `**bold**`, `*italic*`, `__underline__`, `- ` bullet lines, runs of underscores for
  a blank, and line breaks stored as the two characters `
`.
- **Dollar signs.** Math uses `$…$` for LaTeX. Reading & Writing uses `$` for money, so LaTeX is
  only parsed in Math.
- **Source name in the content.** `**[bluebooky.com]**` appears 537 times in chart titles and
  axis labels. It is stored and shown as received.
- **Mis-tagged questions.** 23 questions have a skill filed under the wrong topic at the source.

## Recording a HAR

1. Log in to the site in Chrome. Open DevTools → **Network**, tick **Preserve log**.
2. Start recording **before** creating the drill or mock.
3. **Drill:** create it, then finish it and open the results. The questions do not need to be
   opened or answered one by one.
   **Mock:** open every question in Module 1, submit it, open every question in Module 2,
   submit, then open the results.
4. Export with the default **"Export HAR (sanitized)"**, which strips cookies and auth headers.
5. Save it under `docs/references/network/`.

## Pipeline

```
HAR ─> client ─> discovery ─> raw files ─> parser ─> normalizer ─> validator ─> MongoDB
```

| Step | File (under `apps/worker/src/`) | What it does |
| --- | --- | --- |
| Source | `scrapers/source/bluecorn/client.ts` | Reads RPC request/response bodies. Headers are never read |
| Discovery | `scrapers/source/bluecorn/discovery.ts` | Finds mock and drill attempts; groups one attempt's calls in order |
| Parse | `scrapers/source/bluecorn/{paper,question}.ts`, `scrapers/parsers/` | Source field names → typed source objects |
| Normalize | `scrapers/normalizers/bluecorn.normalizer.ts` | Source objects → SAT Sharks paper/questions |
| Validate | `scrapers/validators/import.validator.ts` | Schema and consistency checks |
| Store | `services/import.service.ts` | Upsert into MongoDB as Draft |

```bash
npm run scrape:paper -- docs/references/network/mathmodule.org.har --dry-run   # files only
npm run scrape:paper -- docs/references/network/mathmodule.org.har             # files + MongoDB
```

Exactly one paper per run: if a recording holds several attempts, the command stops and asks
for `--attempt <id>`.

### Module assignment

- **Drill:** every question gets module type `none`. A drill is a flat set.
- **Mock:** `module_type` from the result payload; otherwise call order (before or after
  `mEndModule1`); otherwise `unknown`.

### Validation

Errors stop the import: schema failures, no questions, duplicate source question or duplicate
question number within a module, multiple-choice with fewer than two choices, a correct answer
that is not one of the choices.

Warnings are printed and saved but do not stop it: result call missing, questions without an
answer or without content, fewer questions captured than the source reports, unrecognised
section, type or difficulty, exam source name missing.

The real recording produced no errors and no warnings.

## Raw and normalized data

```
data/proof-of-concept/<attempt-id>/
  raw/rpc-calls.json          the attempt's RPC calls: function, request body, response body
  raw/exam-catalogue.json     exam sources and label vocabulary
  normalized/paper.json
  normalized/questions.json
  metadata.json               source, HAR file name, attempt kind, counts, warnings, errors
```

`data/` is git-ignored. Raw files contain no headers, cookies or tokens (checked on the real
output). They do contain the answers the person selected during the recording.

## Limitations

- A drill is not a paper in the SAT sense: no modules, no fixed order, no time limit of its own.
  It is a slice of one exam source's question bank.
- The 50 questions are a random 50 of that exam source's 186 Math questions. Importing the rest
  takes more drills (the filter has an "exclude answered" option).
- `sourcePaperId` is an attempt ID, so each recorded drill becomes its own paper. The same
  source question can appear in several of them; `{ source, sourceQuestionId }` is indexed to
  find those.
- Difficulty, topic and skill are `null` unless the drill was filtered to a single value.
- No explanations.
- Chart and table data is stored as the source's structure and drawn by our own code, so a
  figure may differ in appearance from the source's.

## Content ownership — needs a client decision

The source's questions are behind a login, watermarked "bluecorn.org", and labelled as real SAT
administrations. Using them in a paid product carries copyright and terms-of-use risk. The
proposal's plan is different: SAT Sharks supplies past papers as PDFs and an admin approves the
extraction. Imported data stays `draft` and `data/` stays out of Git until that is settled.
