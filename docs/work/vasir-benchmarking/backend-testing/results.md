# Backend testing — current results

[Benchmark](https://vasirbenchmark.com/benchmark-report.html#backend-testing)

| Model setting | Minimal /100 | Skill /100 | Uplift |
|---|---:|---:|---:|
| Sol 6.1 xhigh | 53.850 | 90.475 | +36.625 |
| Astra ultra | 54.675 | 85.850 | +31.175 |
| Opus 5.5 xhigh | 49.625 | 85.225 | +35.600 |
| Astra xhigh | 54.125 | 83.500 | +29.375 |

The mean is **53.06875 → 86.2625**, a 33.19375-point improvement on one known player-saves maintenance case. These are model judgments on one attempt per condition, not a general model ranking. Sol leads; Ultra is 0.625 ahead of Opus, and Astra xhigh is 1.725 behind Opus.

## One additive score

| Criterion | Weight | Rating source |
|---|---:|---|
| Preserved existing protection | 25% | Saved reviewer finding: retained 1, lost 0 |
| Behavioral coverage | 20% | Native 0–1 rating |
| Assertion quality | 15% | Native 0–1 rating |
| Test-layer fidelity | 10% | Native 0–1 rating |
| Semantic variable names | 10% | Native 0–1 rating |
| Domain structure | 5% | Native 0–1 rating |
| Clarity and diagnosis | 5% | Native 0–1 rating |
| Maintenance cost | 5% | Native 0–1 rating |
| Meaningful runnable coverage | 5% | Saved reviewer finding: yes 1, no 0 |

Multiply each rating by its weight and sum; average the two reviewers' totals. There is no ceiling or whole-score override. Missing required evidence leaves no score. Preservation separately values avoiding regressions and overlaps with total behavioral coverage. Both categorical findings are explicitly binary, not invented fractional grades. Execution evidence supports the runnable finding; shared shutdown diagnostics remain separately reported.

This aggregation was adopted at the user's request after the saved reviews. Every original rating, finding, reason, citation and authored byte remains unchanged. Losing preservation subtracts exactly 25 points while all other qualities still affect the total. All Minimal suites removed the independent persisted-checkpoint reader, and all Skill suites retained it. Of the average uplift, 25 points come from preservation and 8.19375 from the seven graded dimensions. Runnable coverage contributes the same five points to every suite.

## File headers and the actual tests

The viewer opens the same file path in both conditions. The reported screenshot had opened the Minimal save/load journey beside the Skill checkpoint reader: different files. No retained spec lost its existing header in any of the eight suites. The original checkpoint reader had no header; Ultra, Astra xhigh and Sol retained that absence, while Opus added one. All Minimal suites deleted that reader entirely.

The local skill now requires concise file headers stating protected behavior, exercised boundary and scope limits; useful headers must be preserved and stale claims updated. This word-neutral clarification and the future judge's explicit header criterion have not been evaluated by another model round. Public scores still identify the frozen evaluated skill bundle.

Ultra and Sol prove a distinct next save advances revision and reloads the exact checkpoint, and complete a retry/reload after failed commit. Astra xhigh omits those continuations. Opus checks revision advancement and completes recovery/reload, but its distinct follow-up inline save lacks persisted readback and its fault injection does not establish the preceding copy as precisely.

Naming remains weak and reviewers disagree. Astra zeros naming for all suites because an editable shared helper uses `result` for a player-state query response. Opus zeros both Astra Skill suites for `bytes` holding a gzip-base64 checkpoint, while giving Sol/Opus positive naming despite the same helper. Both judgments remain visible without overrides.

## Execution, cost and evidence

Four fresh Skill authors and two blind reviewers completed six native sessions without retries. Four identical-input saved Minimal artifacts were reused; all eight suites were reviewed anew in opposite source order. Each reviewer supplied 56 dimension ratings plus preservation and runnable findings. This score/viewer correction makes **zero new model calls**.

Recorded native traffic remains **384,053 tokens**, including cached input, with no missing usage. Reasoning is a subset of output. This is benchmark traffic, not a bill or all conversation usage.

All four fresh suites pass both behavioral controls and detect both seeded faults. Shared websocket shutdown diagnostics fail separately. Generation is a tool-free patch task with external execution; this does not measure repository exploration, author test-feedback iteration or unseen-case transfer. Reviewers receive original/final suites, helpers, contract and trusted execution evidence, with full production implementation omitted to bound context.

Private evidence: `.agents/vasir-evals/backend-testing/compact-round-2026-10-10/`. Native inputs and outputs remain pinned in `publication.json`; aggregation and publication receipts are under `weighted-score/publication/`. The exact public archive contains twenty JavaScript specs totaling 74,364 UTF-8 bytes. Full patches, helper context and native streams remain private.

Evaluated skill SHA-256: `9310c5b6fde31049af1add359eacfae87bc75acac166df237c05d953db200f4f`. The local header clarification is newer than this snapshot.

Release `6e54ac66be68de5482f2a0112f82bc6b1612b750ef1378af3b9eaf57e7cb51b1` is live. All 57 backend tests, 29 site-lock tests, 36 candidate browser checks, 24 live browser checks and 19 publisher byte checks pass. Root inspected desktop/mobile tables, matching file headers and the contained score breakdown. Full responses.js is byte-identical; all 48 native source pins and twenty spec files are unchanged. Zero new model calls. Preview stopped. Receipts: `weighted-score/publication/completion.json` and `weighted-score/publication/live/audit.json` under the current private evidence root.
