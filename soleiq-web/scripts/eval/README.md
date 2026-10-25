# Screening evals

## `safetyEval.ts` — runs now, no API key

Deterministic check of `enforceScreeningSafety`. Three case kinds:

- **must_strip** — care-discouraging language that has to be removed
- **must_keep** — ordinary advice that must survive
- **must_escalate** — an urgent sign that must force `urgent` whatever level
  the model returned

**False negatives** — a leaked care-discouraging claim, or a missed
escalation — are reported separately and are the metric that matters. A
change that improves healthy wording and costs one false negative is a bad
trade.

Run it from a scratch test file, or import `runSafetyEval()` directly.

### Result of the regex change in this task

| | before | after |
|---|---|---|
| must_strip | 6/8 | **8/8** |
| must_keep | 2/6 | **6/6** |
| must_escalate | 5/5 | 5/5 |
| **false negatives** | **2** | **0** |

The old word-level regex was wrong in both directions: it deleted four pieces
of ordinary advice containing "fine", and let `rules out` and
`perfectly healthy` through.

## `levelEval` — NOT BUILT, and why

A four-level confusion matrix over real photographs is the eval this product
actually needs, and it is not here. Three things are missing and none of them
can be invented:

1. **No labelled corpus.** The only labels in the repo are
   `soleiq-foot-ai/data/sample/labels.csv` — 80 rows, synthetic
   (`p_000_synth`), and binary `ulcer`/`no_ulcer` rather than the four
   screening levels. Healthy feet across a range of skin tones, which is the
   population this task is about, do not exist in this repo at all.
2. **No credits.** The vision path returns
   `400 invalid_request_error — credit balance too low`, so nothing can be
   scored even with a corpus.
3. **Sourcing it is a consent question, not an engineering one.** Photographs
   of identified patients' feet are PHI. Assembling a labelled set is a
   decision about what those patients agreed to, and it is not mine to make.

When all three are resolved, the harness to write reports: confusion matrix
across `clear / watch / see_someone_soon / urgent`, with **false negatives**
(a real concern called `clear`) counted and reported on their own line.
