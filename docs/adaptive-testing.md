# Adaptive testing — findings

Source: `bluecorn.org`. Evidence is the site's JavaScript bundle and two **drill** recordings.
**No adaptive mock has been recorded.** Drills have no modules and no routing, so nothing below
was seen in a real mock response. Each statement says what it is based on.

## Observed

Read directly from the site's client code:

- A mock is started with `mStart { p_section, p_exam_ids, p_timer, p_t_time, p_name }`. It covers
  **one section**. The start dialog describes Math as "44 Questions (2 Modules)", "70 Minutes",
  and Reading & Writing as "54 Questions (2 Modules)", "64 Minutes".
- The attempt object has `current_module`, `m2_type`, `m1_correct`, `m2_correct`, `count`,
  `correct`, `incorrect`, `unanswered`.
- `m2_type` takes the values `m2_hard` and `m2_easy`. The UI labels them "Hard Module 2" and
  "Easy Module 2".
- Submitting Module 1 calls `mEndModule1 { p_attempt_id }`. **The request contains only the
  attempt ID**: no score, no answers, no route.
- After `mEndModule1` the app reloads the attempt (`mGetAttempt`) and continues with Module 2.
- Questions are fetched one at a time: `mGet { p_attempt_id, p_position }`.
- The result page (`mrGetResult`) groups questions by `module_type`: `m1`, `m2_easy`, `m2_hard`.
- The site's own description: "Score high in Module 1 to unlock the Hard Module 2".

## Inferred

Likely, but not confirmed by a response:

- **Routing is decided on the server.** The client sends nothing but the attempt ID at the end
  of Module 1 and has no routing logic in its code.
- **The decision is based on the Module 1 correct count.** The server stores `m1_correct` next to
  `m2_type`, and the site's text ties the hard module to a high Module 1 score.
- **The browser never receives the other route's questions.** Questions are requested by
  position within the attempt, one at a time.
- Each Math module has 22 questions and 35 minutes; each Reading & Writing module has 27
  questions and 32 minutes. The source states only the section totals; the even split is assumed
  and matches the real Digital SAT and the proposal.

## Unknown

- **Adaptive routing rule: not directly exposed.** No threshold appears in the client code.
- Whether the rule is a fixed cut-off, differs by section, or weighs questions differently.
- Whether Module 2 positions restart at 1 or continue from Module 1.
- The exact shape of the `mGetAttempt`, `mEndModule1`, `mEnd` and `mrGetResult` responses.
- Whether Module 1 is the same for every attempt from one exam source, or drawn from a pool.
- Whether the easy and hard Module 2 share any questions.
- Per-module time limits (only section totals are shown).
- Whether difficulty is stored per question on the server (it is never sent to the browser).

## Module structure

| | Module 1 | Module 2 |
| --- | --- | --- |
| Identifier | `m1` | `m2_easy` or `m2_hard` |
| Selected by | Fixed for the attempt | Server, after Module 1 is submitted |
| Questions (Math) | 22 (inferred) | 22 (inferred) |
| Obtainable from one attempt | Yes | Only the assigned route |

## Sessions and attempts

- An attempt has a UUID and a status (`active`, `paused`, `done`).
- Each question in an attempt has its own per-attempt ID (`testId` / `id`) and a stable bank ID
  (`contentId` / `content_id`).
- Progress is saved on the server (`mAnswer` with answer, flag and time), and `idx_last` records
  the last position, so an attempt resumes where it stopped.

## Multiple paths

**Not observed: no path at all has been observed yet.** One mock shows one route. Seeing the other
route requires a second attempt with a clearly different Module 1 result, through normal use of
the site. Even then, the threshold between them stays unknown.

## What the importer records

| Field | Value |
| --- | --- |
| `paper.adaptive.routing` | `server_side` if the Module 1 submission was captured, else `unknown` |
| `paper.adaptive.observedRoute` | The attempt's `m2_type`, or null |
| `paper.adaptive.module1Correct` | The attempt's `m1_correct`, or null |
| `paper.adaptive.routingThreshold` | Always null for this source |

## For the SAT Sharks engine

The source's rule cannot be copied because it is not exposed. The Phase 2 engine needs its own
rule, defined by SAT Sharks (the proposal says "Module 2 is easier or harder depending on
Module 1" without giving a threshold). The schema already supports a paper holding `m1`,
`m2_easy` and `m2_hard` modules.

This document is updated after the first real mock import.
