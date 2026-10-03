# Adaptive testing — findings and the SAT Sharks engine

## Evidence

- The source site's JavaScript bundle (from the recordings in `docs/references/network/`).
- **Two Math adaptive mocks taken on the source on 2026-10-03** with a session token, through
  the same calls its own app makes (`npm run observe:mock`). Recordings are in
  `data/mock-observations/` (git-ignored).
  - Mock A: Module 1 submitted with **no answers**.
  - Mock B: Module 1 answered with **our answer key** (all 22 graded correct by the source).

Each statement below says whether it was observed, inferred, or is unknown.

## Observed

- A mock covers **one section**. It is started with
  `mStart { p_section, p_exam_ids, p_timer, p_t_time, p_name }`; `p_exam_ids: null` draws from
  every exam source.
- **Math: 22 questions per module, 35 minutes per module** (`t_time: 2100` seconds), two modules.
- Questions are fetched one at a time (`mGet { p_attempt_id, p_position }`).
- Submitting Module 1 sends **only the attempt ID** (`mEndModule1 { p_attempt_id }`). The response
  is `{ m2_type, m1_correct, m2_start_pos, m2_question_count }`.
- **Routing:** 0 correct in Module 1 gave `m2_easy`; 22 of 22 correct gave `m2_hard`.
- **Module 2 numbering restarts at 1** (`m2_start_pos: 1`).
- The other route's questions never reach the browser.
- The result call (`mrGetResult`) returns every question with its `module_type`
  (`m1`, `m2_easy`, `m2_hard`) and answer key.
- **Module make-up:** each module is spread across the skills. Every observed Math module
  covered 19 or 18 of the 19 Math skills, with a few skills twice, and drew from 8–10 different
  exam sources.
- **The source's own difficulty tag does not separate the routes.** All 88 questions in the four
  observed modules, including the 22 in the hard Module 2, are tagged `easy` by the source's
  filter. By topic, skill, type and exam source, the hard and easy Module 2 look alike.
- The two observed Module 1s shared no questions; the easy and hard Module 2 shared none.

## Inferred

- Module 1 and Module 2 are drawn at random per attempt, one question per skill in turn.
- The hard module may use a difficulty the source does not expose, or may not differ in
  difficulty at all. The observations cannot tell these apart.

## Unknown

- **The routing threshold.** Only the two extremes (0 and 22 of 22) were observed.
- Reading & Writing module sizes and timing on the source (no Reading & Writing mock was taken;
  its start dialog states 54 questions, 64 minutes).
- Whether "hard" questions exist on the source in any form a browser can see.

## The SAT Sharks engine (built)

| | |
| --- | --- |
| Sections | Math: 22 + 22 questions, 35 minutes per module. Reading & Writing: 27 + 27, 32 minutes per module |
| Question pool | Published questions of the chosen section, from every exam or the exams the student picks |
| Module 1 | One question per skill in turn until full, random within a skill |
| Module 2 (harder) | Same spread; within each skill hard first, then medium, unlabelled, easy |
| Module 2 (easier) | Same spread; within each skill easy first, then medium, unlabelled, hard |
| Repeats | Module 2 never contains a Module 1 question |
| Order in a module | Math: easier to harder. Reading & Writing: official domain order (Craft and Structure, Information and Ideas, Standard English Conventions, Expression of Ideas), easier to harder within a domain |
| Routing | Harder Module 2 when Module 1 correct ≥ ⌈size × threshold⌉. Default **65%**: 15 of 22 (Math), 18 of 27 (Reading & Writing). Admin setting, applied when Module 1 is submitted |
| Building Module 2 | Only after Module 1 is submitted, on the server. Before that it does not exist |
| Timing | Each module has its own server-side clock. When Module 1's time runs out it is submitted automatically and Module 2 starts; when Module 2's runs out the mock ends |
| Locking | A submitted module cannot be opened or changed (the API answers 409) |
| Answers | No answer check during a mock; keys are shown in the results |

What this means in practice:

- **Reading & Writing adapts for real.** The source's difficulty tags are real for this section
  (4,739 easy, 2,981 hard), so the harder Module 2 is made of hard-tagged questions.
- **Math adapts only as far as its labels allow.** Most Math questions are tagged easy by the
  source. Where hard-tagged questions exist in the pool, the harder module uses them first (in
  the end-to-end test with all Math exams published, 21 of 22 were hard-tagged); otherwise it is
  a spread like the source's own. Setting difficulty in the admin question editor improves it.

Not yet built: a 400–1600 scaled score (needs SAT Sharks' conversion tables), a full test of
both sections in one sitting with the break between them, and extended time.
