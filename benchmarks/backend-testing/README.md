# Backend test-suite quality benchmark

Measures independent assertions, useful end-to-end protection, appropriate focused units, semantic names, coherent domain structure and economical maintenance. Tautologies and redundant machinery are defects.

The [current report](https://vasirbenchmark.com/benchmark-report.html#backend-testing) compares four fresh Skill suites with four identical-input saved Minimal suites on one player-saves maintenance case: Astra ultra/xhigh, Sol 6.1 xhigh and Opus 5.5 xhigh. Two blind reviewers graded all eight suites. Six native calls completed without retries; 384,053 recorded tokens include cached input. The current scoring/viewer correction uses zero new model calls.

One additive /100 score uses preservation 25%, behavioral coverage 20%, assertions 15%, fidelity 10%, semantic naming 10%, domain structure 5%, clarity 5%, maintenance 5%, runnable coverage 5%. Seven native ratings remain unchanged; saved protection retained/lost and runnable yes/no map to 1/0. Sum each reviewer's contributions and average both totals. Unresolved evidence has no score. Preservation separately values avoiding regression and overlaps with overall coverage. The aggregation was adopted after reviews at the user's request.

`BACKEND_TESTING_SCORE_CRITERIA` in the current projector owns final weights. The pinned rubric records the original grading instrument; it is not rewritten to imply these aggregation weights preceded the reviews. Local `taste-rubric.json` includes future guidance on useful file headers, which has not been regraded into current results.

Inspect run opens matching file paths with exact JavaScript, native findings and all nine score contributions. No retained header was deleted; the original checkpoint reader lacked one. The local skill now explicitly requires concise purpose headers, but current scores retain the evaluated skill snapshot. Reviewer naming disagreement remains visible.

`publication.json` pins native evidence; the projector validates source hashes, complete file inventories, execution, citations and arithmetic. Current evidence resides under `.agents/vasir-evals/backend-testing/compact-round-2026-10-10/`, with this release under `weighted-score/publication/`. Backend context, patches and native streams stay private.

All fresh suites pass two controls and catch both seeded faults. Shared shutdown diagnostics fail separately. Tool-free generation plus external execution does not measure repository exploration or author feedback iteration; one known-case trial does not establish general superiority. Read `docs/work/vasir-benchmarking/backend-testing/results.md` for current results and receipts. Reuse saved reviews for presentation changes; never reroll to force a preferred winner.
