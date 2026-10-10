# Backend testing — current results

[Live benchmark](https://vasirbenchmark.com/benchmark-report.html#backend-testing)

## Current comparison

| Model setting | Minimal /100 | Skill /100 | Uplift |
|---|---:|---:|---:|
| Opus 5.5 xhigh | 49.0 | 90.5 | +41.5 |
| Sol 6.1 xhigh | 49.0 | 88.8 | +39.8 |
| Astra xhigh | 49.0 | 88.7 | +39.7 |
| Astra ultra | 49.0 | 87.7 | +38.7 |

Each final score combines the same reviewer's seven-dimension weighted quality ×100 with their saved protection assessment, then averages both reviewer results. Loss of existing protection caps a reviewer at 49; no meaningful runnable coverage scores zero; unresolved required evidence leaves no score. The combined mean is **49 → 88.9375**.

This scoring combination was adopted after the reviews at the user's request. Both reviewers found that every Minimal suite removed the independent test for loading an existing checkpoint and every Skill suite retained it, so all Minimal totals hit the same ceiling. The large overall difference reflects this preservation penalty. These are exploratory judgments on one known player-saves case, one trial per condition—not a general effectiveness estimate. Raw ratings and source reviews remain unchanged.

The public page uses one ranked model comparison. Inspect run opens the exact authored JavaScript files with copy controls, followed by dimension profiles and original findings. The closed calculation disclosure shows how weighted quality and the protection cap produce each final score. Method and evidence starts closed.

| Dimension | Weight | Minimal | Current skill | Difference |
|---|---:|---:|---:|---:|
| Assertion quality | 25% | 0.89500 | 0.92250 | +0.02750 |
| Behavioral coverage | 20% | 0.82375 | 0.90375 | +0.08000 |
| Test-layer fidelity | 15% | 0.87250 | 0.91250 | +0.04000 |
| Domain structure | 10% | 0.93000 | 0.89250 | −0.03750 |
| Clarity and diagnosis | 10% | 0.89125 | 0.89000 | −0.00125 |
| Maintenance cost | 10% | 0.81875 | 0.80625 | −0.01250 |
| Semantic variable names | 10% | 0.85000 | 0.82250 | −0.02750 |

Each reviewer’s suite score uses these fixed weights. Average the two reviewer totals per suite, then the four matched differences equally. Every retained spec file has its own seven ratings; file scores never determine suite scores.

The reviews credit stronger assertions, coverage and test-layer choices. Naming, structure and maintenance remain weaknesses. Opus considers the separate seeded reader an extra ownership/runtime cost; Astra considers it a coherent independent capability. Both judgments are retained. Generic names such as `bytes` for encoded text remain visible findings.

Semantic naming is mandatory. An unresolved opaque domain-bearing identifier, such as `x`, zeros naming for its affected file and suite. Other dimensions retain their scores; meaningful loop indices and coordinates are judged in context. No returned naming rating triggered the zero rule.

One source-audit qualification accompanies Opus’s Astra-ultra Minimal clarity finding: “every” recovery assertion having a message is overstated. Assertions at lines 48, 56, 86 and 87 lack messages; the cited cleanup checks at 92–107 have them. The correction remains beside the unchanged native finding and rating.

## Source, execution and resources

The four exact model settings have one authored trial per condition. Task, source, tools and budgets match; only the complete current three-file skill differs. All authored artifacts remain fixed. Sixteen behavioral controls pass, and all sixteen supporting fault replays detect their relevant revision or failed-commit fault. Shared websocket cleanup diagnostics remain separately recorded.

Reviewers receive anonymous artifacts, production context and trusted execution evidence, with source presentation order reversed. The retry uses exactly the original Astra prompt, system, schema, mapping, rubric and source bytes. Its pinned amendment permits one user-requested call with a twenty-minute limit and no automatic retries. It is selected by validity, never score. The first timeout and completed Opus review remain intact.

The prompt was oversized for this task: 214,934 bytes, roughly 5,100 lines, comprising 10,168 bytes of instructions/rubric, 94,803 bytes of shared originals/context and 109,963 bytes of final suites/evidence. Each reviewer was asked for 196 numeric ratings and 76 cited explanations. Future evaluation design should bound relevant code context and explanation volume before launching; increasing timeout alone does not reduce this work.

This retry recorded 388,323 input tokens, including 304,768 cached input tokens, and 26,177 output tokens; 8,078 reasoning tokens are a subset of output. Uncached input was 83,555 tokens. Selected evidence now accounts for thirteen attempted native sessions and 1,295,780 known tokens, with the first timeout’s usage still unknown. These are recorded traffic counts, not a bill or the usage of all work in this conversation. No further model calls are scheduled.

## Publication

Release `1c2e9e69caaff677c3f2356887f4beb5e4b170898edf92fe32cdf13b8093431c` is live. Forty-nine backend tests, thirteen shared-layout tests, twenty-eight site-lock tests, thirty-six candidate browser checks, twenty-four live HTTPS checks and nineteen publisher byte checks pass. Desktop/mobile table and code screenshots were visually inspected; actual clipboard contents match the test files. The independent scoring and privacy audits are green. Receipts: `dimensional-review-2026-10-10/combined-score/publication/` under the private evidence root.

Private evidence root: `.agents/vasir-evals/backend-testing/paired-repair-2026-10-09/`. Frozen dimensional inputs are under `dimensional-review-2026-10-10/`; the authorized completed reviewer receipts are under `astra-retry/`. The public test-file archive contains only the twenty verified final `.spec.js` files, totaling 68,152 UTF-8 bytes. Production context, full patches and raw native streams remain private. Native grades, evaluated skill, source pins and authored artifacts are unchanged.
