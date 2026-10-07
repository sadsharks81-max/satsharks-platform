# Full-test upload ("full-length practice test fetcher"): specification

This is the feature as built and verified on the primary SAT Sharks site (commits `832ad4c` and `13f8288`). Treat the behaviour and rules here as the requirements. Treat the files under `reference/` as one working implementation, written for a codebase that may differ from yours: Express + Mongoose backend, TanStack Start + Tailwind frontend.

## 1. What the feature does

An admin uploads **one full adaptive Digital SAT test as two PDFs**: an English (Reading & Writing) PDF and a Math PDF. Each PDF holds the 3 modules of its section:

| Module | Who gets it |
| --- | --- |
| Module 1 | Every student |
| Module 2 Easy | Students who answered **less than 65%** of Module 1 correctly |
| Module 2 Hard | Students who answered **65% or more** of Module 1 correctly |

English and Math are routed independently. Publishing creates one adaptive test with **6 modules**.

Admin workflow:

1. Full Test Uploads tab → **Upload Test**: title, year, test number, English PDF, Math PDF. Either PDF can be uploaded later.
2. Each PDF is parsed **during the upload request**. The row shows per-module question counts, warnings, or the exact lines that failed.
3. A failed or wrong PDF is fixed and **re-uploaded for that section only**.
4. **Review** each section: edit text, choices, answer, type, difficulty and category, then **Save & mark reviewed**.
5. When both sections are REVIEWED → **Publish Test**. This creates the questions plus the 6-module adaptive test, **Inactive** (hidden from students).
6. In the existing test-management screen the admin adds graphs/images to questions, sets Free/Paid and score tables, then switches the test to **Active**.

## 2. PDF format (strict)

Full admin-facing doc: `reference/docs/FULL_TEST_PDF_FORMAT.md`. Samples: `samples/`.

```text
SECTION: MATH                  <- once, before MODULE 1 (READING_WRITING or MATH)

MODULE 1                       <- also MODULE 2 EASY / MODULE 2 HARD (EASIER/HARDER accepted)
QUESTION 1                     <- numbering restarts at 1 in every module, consecutive
CATEGORY: SAT Algebra          <- must exactly match an existing category of the file's section
DIFFICULTY: MEDIUM             <- EASY | MEDIUM | HARD
TYPE: GRID_IN                  <- optional; MULTIPLE_CHOICE (default) or GRID_IN (Math only)
PASSAGE: ...                   <- optional
PROMPT: ...                    <- required
A: ... B: ... C: ... D: ...    <- all four for multiple choice; none for GRID_IN
ANSWER: B                      <- A-D, or for GRID_IN one short line, e.g. "0.5 or 1/2"
EXPLANATION: ...               <- required
END QUESTION
END MODULE
```

Rules the parser enforces (reject the **whole file** on any error, with line-level messages):

- Fields in the order above. A value may continue onto following lines.
- `SECTION` exactly once, before any module; never inside a question.
- All three modules present, each exactly once, each non-empty.
- Every question has `END QUESTION`; questions only inside modules.
- The section declared in the file must match the slot it was uploaded to (English slot ⇒ `READING_WRITING`).
- Categories are checked against the live category list at upload time and again at save and publish.
- Module size is a **warning only**: official modules are 27 (English) and 22 (Math).

### Lessons from real PDFs (do not skip)

- PDF text extraction (pdf-parse v2) breaks text at **every visual line wrap** and inserts page markers like `-- 1 of 3 --`. Strip the markers.
- **English: re-join wrapped prose.** A new paragraph starts only at a blank line or a list item (`•`, `-`, `*`, `1.`). Choices and the prompt become single lines.
- **Math: keep the author's line breaks**, because equations and tables rely on them.
- The primary site's test runner shows a Reading & Writing question's **last line as the question and everything above it as the passage**. Stored text is therefore `PASSAGE + "\n" + PROMPT`, with the prompt kept on one line. Check how your runner splits passage and question and match it.
- Strip invisible format characters (zero-width spaces, BOM, soft hyphens) and turn non-breaking spaces into spaces before matching labels.
- Upper-case MCQ answers; keep grid-in answers as typed.
- `MODULE 2 EASIER` must map to Easy. A naive `includes("EASY")` check got this wrong.

## 3. Data and publish contract

Upload record (separate collection, e.g. `FullTestUpload`): `title, year, testNumber, status (DRAFT|PUBLISHED), readingWriting, math, publishedTest, publishedAt, uploadedBy`. Each section holds `fileName, fileSize, status (EXTRACTED|REVIEWED|FAILED), errorMessage, warnings[], questions[], uploadedAt, reviewedAt, reviewedBy`. Each question holds `moduleSlot (MODULE_1|MODULE_2_EASY|MODULE_2_HARD), questionNumber, questionType (MULTIPLE_CHOICE|GRID_IN), text, options[], correctAnswer, explanation, category (name), difficulty`.

- **Do not store the PDF.** Parse it from memory during the upload request. Hosts such as Railway wipe the local `uploads/` folder on every deploy.
- Year/test number: integers. Year 2000–2100. **Year 9999 is reserved** on the primary site for student-generated custom tests, which the admin list hides. Reject duplicates against existing tests **and** other draft uploads.
- Publish only when both sections are REVIEWED; re-validate everything at publish time.
- Publish creates the questions (`status: PUBLISHED`, grid-in ⇒ `options: []`) and then the test, **Inactive**, adaptive, 10-minute break, English modules 32 min, Math modules 35 min.
- **Module order is the routing contract.** The primary site's engine expects exactly:
  `0 R&W Module 1, 1 R&W Module 2 Easier, 2 R&W Module 2 Harder, 3 Math Module 1, 4 Math Module 2 Easier, 5 Math Module 2 Harder`,
  routing 0→(≥65% ? 2 : 1), break after 1/2, 3→(≥65% ? 5 : 4), end after 4/5. **Find your site's adaptive engine and match its expectations exactly.** If your site has no adaptive engine, stop and report this before building.
- If creating the test fails after the questions were inserted, delete those questions; there is no transaction. The unique (year, testNumber) index stops a double publish.
- After publishing, uploads and review saves for that record are refused (409). Deleting the upload record never deletes the published test.
- Don't tag full-test questions with any "source" value that an import script mass-deletes. The primary site's `importDSAT.ts` deletes every `source: "SAT"` question, so uploads use `source: "AI_EXTRACTED"`.

## 4. Keep full-test questions out of practice

- Every published question gets the tags `full-test` and `full-test:<testId>`.
- Every **student-facing question pool** must exclude `tags: "full-test"`. On the primary site those were the practice question list (`GET /api/questions`) and generated custom practice tests (`POST /api/practice/custom-test`). Search your codebase for every place students get questions drawn from the bank.
- A question an admin adds by hand to an uploaded test inherits both tags.
- Existing script-imported tests were **deliberately not** excluded. On the primary site, custom practice tests draw from the same "SAT …" categories, and excluding the old tests would have shrunk those pools by about 75%. Check your data before deciding, and ask the owner.

## 5. Changes to existing screens and endpoints

- **Activation guard:** a test can only be set Active if every module has questions (and an adaptive test has exactly 6 modules). Check existing tests first so nothing that is live today gets blocked.
- **Test-management list performance:** the primary site's admin list populated every question and inline base64 image of every test: 18.9 MB, 12–18 s, past the client's 30 s timeout as more tests were added, and a just-published test appeared to be "missing". The list now returns tests with question ids only, and the Questions dialog loads one test in full, showing a loading state. Check your equivalent screen.
- **Related bug fixed in the same release:** the practice list returned only `status: "PUBLISHED"` questions, but attaching an image sets a question to `"UPDATED"`. So every graph question vanished from practice. Student-facing lists should accept `PUBLISHED` and `UPDATED`. Check whether your site has the same rule.

The exact edits made to existing files are in `changes-to-existing-files.patch`.

## 6. Admin UI (match your site's design, not the primary site's)

- **Full Test Uploads tab:** a format help panel with sample-PDF downloads and a link to the printable builder (`reference/frontend/public/full-test-import-template.html`). Below it, a table with **one row per test**: test (title, year, number), English cell, Math cell, status, actions.
  - Section cell: status badge, question count, file name, per-module counts, warnings, an expandable "why it failed" section, and Review / Re-upload actions.
  - Row actions: Publish (enabled only when both sections are reviewed), Open in Test Management (after publish), Delete.
- **Upload dialog:** title, year, test number, English PDF, Math PDF, a note that each PDF is checked immediately.
- **Review page per section:** one tab per module with counts (flag sizes that aren't the official count). Each question shows a type switch (Math only), text (English: "the last line is the question"), a preview as students will see it, A–D choices (click a letter to mark it correct) or a grid-in answer input, explanation, correct answer, difficulty, and a category selector filtered to the section. Problem questions are flagged live, and saving is disabled while any remain. The save button marks the section REVIEWED.

## 7. Verification checklist (what was proven on the primary site)

- [ ] Parser unit tests: valid Math and English files, all module headers including EASIER, page markers, line re-joining, grid-in, and each rejection case (`reference/backend/src/scripts/testFullTestParser.ts`).
- [ ] Sample and demo PDFs (`samples/`) parse through the **real PDF library** with zero errors. The demo PDFs (27/27/27 and 22/22/22) also give zero warnings.
- [ ] End-to-end against a **throwaway in-memory database**: create, duplicate and invalid input rejected, wrong-section re-upload, unknown category, review validation, publish (6 modules in order, tags, grid-in with no options), practice exclusion, activation guard, a student run that routes English Hard and Math Easy, grid-in graded, hand-added question tagged, delete keeps the test (`verification/api-e2e.js`).
- [ ] Admin UI clicked through in a real browser: upload, review, fix a flagged question, publish, open in test management. No console errors.
- [ ] Type checks show no new errors.

## 8. Safety

On the primary site, **localhost pointed at the live database** (`backend/.env`), so a "local" demo upload created a real test and a test account in production. Before running anything that writes, check where the target project's `DATABASE_URL` points. Run automated tests against an in-memory or separate database.
