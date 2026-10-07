# Full-test PDF import format

A full adaptive Digital SAT test is uploaded as two PDFs: one for English (Reading & Writing) and one for Math. Each PDF holds the three modules of its section. The backend rejects a whole PDF when anything is missing, out of order, or assigned to an unknown category, so a broken exam never reaches students.

## How the test is used

Each section has Module 1 and two versions of Module 2. A student who answers 65% or more of Module 1 correctly gets **Module 2 Hard**; anyone below 65% gets **Module 2 Easy**. English and Math are routed separately.

## Create the PDFs

1. In Admin → Test & Question Uploads → Full Test Uploads, download the English or Math sample, or open the printable builder.
2. Put `SECTION: READING_WRITING` (English) or `SECTION: MATH` once at the top of the file.
3. Add the three modules, each between a module line and `END MODULE`.
4. Number questions from `QUESTION 1` inside every module, consecutively.
5. Use category names exactly as they appear in Admin → Questions → Categories, from the same section.
6. Print or export as PDF with browser headers and footers disabled, and confirm the text can be selected. Scanned PDFs are not supported.

## Layout

```text
SECTION: MATH

MODULE 1
QUESTION 1
...
END QUESTION
QUESTION 2
...
END QUESTION
END MODULE

MODULE 2 EASY
QUESTION 1
...
END MODULE

MODULE 2 HARD
QUESTION 1
...
END MODULE
```

`MODULE 2 EASIER` and `MODULE 2 HARDER` are also accepted.

## Question blocks

Multiple choice:

```text
QUESTION 1
CATEGORY: SAT Algebra
DIFFICULTY: MEDIUM
PROMPT: If 3x + 7 = 22, what is the value of x?
A: 3
B: 5
C: 7
D: 15
ANSWER: B
EXPLANATION: Subtract 7 from both sides, then divide by 3.
END QUESTION
```

Grid-in (Math only; the student types the answer):

```text
QUESTION 2
CATEGORY: SAT Advanced Math
DIFFICULTY: HARD
TYPE: GRID_IN
PROMPT: What is the value of 1/2 + 1/4?
ANSWER: 0.75 or 3/4
EXPLANATION: 1/2 + 1/4 = 3/4, which is 0.75.
END QUESTION
```

English questions with a passage:

```text
QUESTION 1
CATEGORY: SAT Reading Comprehension
DIFFICULTY: MEDIUM
PASSAGE: The following text is adapted from a 1913 novel. ...
PROMPT: Which choice best states the main purpose of the text?
A: ...
B: ...
C: ...
D: ...
ANSWER: A
EXPLANATION: ...
END QUESTION
```

Fields must appear in this order: `CATEGORY`, `DIFFICULTY`, `TYPE` (optional), `PASSAGE` (optional), `PROMPT`, `A`–`D` (multiple choice only), `ANSWER`, `EXPLANATION`. A value may continue onto following lines.

| Field | Allowed value |
| --- | --- |
| `CATEGORY` | Exact name of an existing question-bank category in the file's section |
| `DIFFICULTY` | `EASY`, `MEDIUM`, or `HARD` |
| `TYPE` | `MULTIPLE_CHOICE` (default when omitted) or `GRID_IN` (Math only) |
| `ANSWER` | `A`–`D` for multiple choice; for grid-in, one short line. Separate equivalent answers with `or` or commas, e.g. `0.5 or 1/2` |

In English PDFs, wrapped lines inside a passage, prompt, choice or explanation are joined back into sentences. Start a new paragraph with a blank line, and start bullet notes with `•` or `-`. Math keeps line breaks as written, so equations and tables can sit on their own lines.

## Workflow

1. **Upload Test**: enter title, year and test number, and choose both PDFs. Each PDF is checked immediately; the table shows per-module counts, any warnings (for example a module that is not the official 27 English or 22 Math questions), or the exact lines that failed.
2. If a PDF failed, fix it and **Re-upload** only that section.
3. **Review** each section, fix anything that was read wrongly, and choose **Save & mark reviewed**.
4. When both sections are reviewed, **Publish Test**. This creates the adaptive test with all six modules, hidden from students.
5. In Admin → Tests (Digital SAT Test Management), add graphs/images to questions that need them, set Free/Paid and score tables, then switch the test to **Active**. A test cannot be activated while any module is empty.

Questions published from a full test are tagged `full-test` and never appear in the practice question list or in generated custom practice tests.
