Paste everything below the line into Claude Code, opened in the root of the secondary SAT Sharks project, after copying the `full-test-port-kit` folder into that project's root.

---

I want to add the "full-length practice test upload" feature to this website. It was already built and tested on our primary SAT Sharks site, and everything you need is in `./full-test-port-kit/`:

- `SPEC.md`: the requirements, the PDF format, the publish/routing contract, and lessons learned. Read all of it first.
- `reference/`: the primary site's working implementation (backend parser, model, controller, routes; admin upload panel, review page, printable builder). Its stack may differ from ours, so use it as a guide, not something to paste.
- `changes-to-existing-files.patch`: the exact edits made to files that already existed on the primary site.
- `samples/`: sample and full-size demo PDFs in the required format.
- `verification/api-e2e.js`: the end-to-end check that was run there.

How I want you to work:

1. **Study this codebase before writing code.** Find the backend and frontend stack, the existing admin upload screen and practice-question upload flow, the SAT test model, how the adaptive engine routes modules (index order and the 65% rule), the question model (multiple choice vs fill-in/grid-in, image field, statuses, tags), every place students get questions drawn from the question bank, the admin test-management screen, and the shared UI components and theme.
2. **Check where `DATABASE_URL` points** in the backend `.env`. If it's a live/production database, tell me, and don't run anything that writes to it. Test against an in-memory or separate database instead.
3. **Before coding, give me a short plan:** what maps directly from the reference, what differs in this codebase and how you'll adapt it, the exact module order and routing rule this site's engine expects, which student-facing question pools need the `full-test` exclusion, and any spec behaviour that doesn't fit here. Wait for my OK.
4. **Implement it to this site's own conventions and UI/UX:** its components, colours, spacing, naming and file structure. The behaviour and validation rules must match `SPEC.md`. Also check the two related fixes in SPEC §5 (the `UPDATED` status hiding graph questions from practice, and the slow test-management list) and apply them if this site has the same problems.
5. **Verify as SPEC §7 describes:** parser tests, the `samples/` PDFs through the real PDF library, an end-to-end run against a throwaway database (including a student taking the test and being routed by the 65% rule), and a click-through of the admin screens in a browser. Report what passed and anything you couldn't verify.

Don't commit or push unless I ask.
