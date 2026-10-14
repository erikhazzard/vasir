# Writing skill refresh — 2026-10-12

The current storytelling skill improved both models on Core Idea in this small pilot. Scores are weighted judgments out of 100, averaged across two blinded judges and three stories.

| Task | Model | Plain | Current skill | Change |
| --- | --- | ---: | ---: | ---: |
| Core Idea: three cases | Astra xhigh | 77.1 | 92.7 | +15.6 |
| Core Idea: three cases | Sol 6.1 xhigh | 75.6 | 93.6 | +18.0 |

The frozen rubric assesses substance, not whether an answer repeats the controlling-idea formula or guide vocabulary. The improvement is strongest in stating the actual final condition and enacted cause. All Core Idea outputs and judgments are retained.

Core Idea used 19 completed model calls: seven new answers and twelve paired reviews. Five existing plain answers were reused. Twelve answer cells and all twelve paired reviews passed independent score and provenance checks. The original execution and recovery receipts remain immutable locally; no valid answer was retried based on quality.

This is one trial on a selected corpus, with overlapping creator/judge families. Reused plain answers retain their earlier generation dates. It tests frozen root instructions plus selected references delivered inline, not autonomous skill routing, and does not isolate improvement over the previous skill version. This report uses its own scoring basis; the three established Writing benchmarks and their aggregate remain unchanged.

- [Core Idea report](https://vasirbenchmark.com/benchmark-report.html#storytelling-core-idea-refresh)
- [Specification](specification.json) and [run design](README.md)
- [Selected source](publication.json), snapshot SHA-256 `071c75e0c0b9a8fb7d587a218625650b39ce7357bf7870c8709837063885245e`
- [Independent score audit](../../.agents/vasir-evals/storytelling-skill-refresh/publication/independent-score-audit.json)
- [Proof status](../../docs/work/vasir-benchmarking/storytelling-skill-refresh/eval-plan.md)

Published release `0901eec134900d6bffd0c7f95ae0dc8a00b6d61145bef4080366170be981fee2` contains the four-report Writing catalog. Core Idea scores, full answers and judgments, established reports, and all aggregate scores are unchanged. Removal verification passed 151 targeted checks, ten candidate and ten live browser checks, and exact deployed-file checks. No model calls were made for this removal.

- [Publisher receipt](../../.agents/vasir-evals/storytelling-skill-refresh/remove-mmorpg/publish.json)
- [Preservation proof](../../.agents/vasir-evals/storytelling-skill-refresh/remove-mmorpg/publication-preservation.json)
- [Live browser proof](../../.agents/vasir-evals/storytelling-skill-refresh/remove-mmorpg/browser/live/browser-evidence.json) and [byte comparison](../../.agents/vasir-evals/storytelling-skill-refresh/remove-mmorpg/browser/live/byte-comparison.json)
