# Full-test upload: port kit

This folder lets you add the full-length practice test upload feature, already live on the primary SAT Sharks site, to the secondary SAT Sharks site.

## What the feature is

Admins upload one full adaptive Digital SAT test as two PDFs, English and Math, each with Module 1, Module 2 Easy and Module 2 Hard. The site checks the PDFs, the admin reviews the questions and publishes, and the test appears in test management, ready for graphs and activation. Students who score 65% or more on Module 1 get the hard Module 2, and the rest get the easy one. These questions never appear in practice.

## How to use this kit

1. Copy this whole `full-test-port-kit` folder into the **root of your project**.
2. Open the project in Claude Code (VS Code extension or terminal).
3. Open `PROMPT.md`, copy everything below its line, and paste it as your first message.
4. Claude studies your codebase and gives you a plan first. Read it, answer its questions, and reply OK. It then builds the feature in your site's own design and tests it.

Before step 4, check where your backend `.env` `DATABASE_URL` points. If it's your live database, anything you test on localhost reaches real students. That happened on the primary site.

## What's inside

| Path | What it is |
| --- | --- |
| `PROMPT.md` | The prompt to paste |
| `SPEC.md` | Requirements, PDF format, rules, lessons learned, verification checklist |
| `reference/` | The primary site's code for this feature, at its original paths |
| `changes-to-existing-files.patch` | Edits made to files that already existed on the primary site |
| `samples/` | 2-question-per-module samples and full-size demo PDFs (27/27/27 English, 22/22/22 Math) |
| `verification/api-e2e.js` | The end-to-end test used on the primary site (runs against a throwaway database) |

The demo PDFs use categories named `SAT Algebra`, `SAT Advanced Math`, `SAT Data & Statistics`, `SAT Geometry`, `SAT Reading Comprehension`, `SAT Grammar & Writing`, and `SAT Vocabulary`. If your site's categories are named differently, the upload will say exactly which ones are missing.

When it's working, delete this folder from your project or keep it out of your commits.
