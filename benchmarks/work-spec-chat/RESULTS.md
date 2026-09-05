# Work Specs v1 results — September 5, 2026

**Run complete:** 26 configurations, 52 full specs, 104 independent judgments. One authored chat task, one trial per condition. Uncalibrated development evidence.

The work-spec skill improved the panel score in all 26 matched pairs. Mean baseline quality was 87.36/100; mean skill quality was 94.59/100, a gain of 7.24 points. The median gain was 6.25 points. These are equal-configuration summaries of this cohort, not averages across a representative workload.

Astra xhigh and ultra tied for the highest baseline score (96.25) and skill score (100). Both judges marked their skill drafts “Implement as written.” They were the only 2 skill drafts to receive that unanimous verdict. Sol max followed at 98.75; Luna max and Sol high tied at 98.125. A score of 100 means no material defect was identified under the frozen rubric for this case.

## Complete matched results

Scores below retain exact arithmetic; the website displays one decimal. Skill gain is the skill score minus its matched baseline. Readiness disagreements remain unresolved.

| Configuration | Baseline /100 | Skill /100 | Gain | Skill readiness |
| --- | ---: | ---: | ---: | --- |
| Astra ultra | 96.25 | 100 | +3.75 | Implement as written |
| Astra xhigh | 96.25 | 100 | +3.75 | Implement as written |
| Sol max | 93.75 | 98.75 | +5 | Unresolved: Implement after the named correction / Implement as written |
| Luna max | 88.125 | 98.125 | +10 | Unresolved: Implement as written / Implement after the named correction |
| Sol high | 94.375 | 98.125 | +3.75 | Unresolved: Implement as written / Implement after the named correction |
| Sol medium | 85 | 97.5 | +12.5 | Implement after the named correction |
| Sol ultra | 93.125 | 97.5 | +4.375 | Unresolved: Implement after the named correction / Implement as written |
| Luna xhigh | 85 | 96.875 | +11.875 | Unresolved: Implement as written / Implement after the named correction |
| Sol xhigh | 93.125 | 96.875 | +3.75 | Implement after the named correction |
| Terra max | 86.25 | 96.25 | +10 | Unresolved: Implement as written / Implement after the named correction |
| Terra xhigh | 81.25 | 96.25 | +15 | Unresolved: Implement as written / Implement after the named correction |
| Sol low | 82.5 | 95.625 | +13.125 | Implement after the named correction |
| Terra low | 91.25 | 95.625 | +4.375 | Implement after the named correction |
| Terra medium | 86.25 | 95.625 | +9.375 | Implement after the named correction |
| Terra high | 94.375 | 95 | +0.625 | Implement after the named correction |
| Terra ultra | 81.875 | 94.375 | +12.5 | Unresolved: Implement as written / Implement after the named correction |
| Opus 5 xhigh | 77.5 | 93.75 | +16.25 | Implement after the named correction |
| Luna low | 91.875 | 93.75 | +1.875 | Implement after the named correction |
| Luna medium | 86.875 | 93.125 | +6.25 | Implement after the named correction |
| Fable 5.1 max | 88.125 | 92.5 | +4.375 | Unresolved: Fix spec first / Implement after the named correction |
| Fable 5.1 xhigh | 90.625 | 91.875 | +1.25 | Unresolved: Fix spec first / Implement as written |
| Luna high | 85 | 91.875 | +6.875 | Implement after the named correction |
| Opus 5 high | 81.25 | 87.5 | +6.25 | Implement after the named correction |
| Opus 5 low | 76.875 | 87.5 | +10.625 | Unresolved: Fix spec first / Implement after the named correction |
| Opus 5 max | 81.25 | 87.5 | +6.25 | Unresolved: Fix spec first / Implement after the named correction |
| Opus 5 medium | 83.125 | 87.5 | +4.375 | Unresolved: Fix spec first / Implement after the named correction |

## Evidence and interpretation

- Judges: Astra xhigh and Fable 5.1 max, independently scoring anonymous candidates. The six dimension weights are 25/15/20/15/15/10; both assessable judgments are required for a panel score.
- Treatment: the frozen work-spec skill, two supporting templates, and three explicitly required root excerpts. The matched prompts differ only by that bundle. This is an isolated skill intervention, not normally routed Full Vasir.
- All 52 generations and 104 judgments passed saved-stream replay, invocation/input checks, candidate-source checks, and independent arithmetic validation. Fourteen Claude generations attest Fable 5.1 or Opus 5. Codex identity is evidenced by the recorded requested CLI configuration; its receipt is not separate server-model attestation.
- The initial Fable timeout and incomplete continuation capture remain preserved alongside complete recoveries. Claude quota rejections are preserved too. The coordinator waited for the server reset, completed only missing cells, and encountered no further runtime/assessment failures after resumption.
- All raw attempts, prompts, responses, assessments, usage, runtime receipts, frozen inputs, and runner snapshots are retained. The permanent archive contains 2,061 inventoried files, totaling 58,475,015 bytes at its first complete snapshot. Later publication receipts sit outside that archived tree.
- The six incumbent Codex generations and twelve initial judgments remain byte-identical. All 216 Engineering responses and their 432 judgments retain their previous public measurements and content.
- One case and one trial cannot establish general model superiority or a repeatable causal gain for each setting. The rubric has not been calibrated against human ratings or downstream implementations. Both judges are also represented among the generators; anonymization does not eliminate style recognition or possible self-preference.
- Independent source checks on initial findings found some overreaching requirement attribution. Raw judgments and scores are preserved; these checks did not adjudicate or rescore the panel. Judge agreement alone is not proof that a finding is correct.

The [task and method](README.md) and [publication declaration](publication.json) describe the frozen comparison. The selected source is pinned in `benchmarks/public-results.json`. Full prompts, specs, and individual assessments are included in the production report bundle.

**Publication status:** Live on September 5, 2026: [AI Workflows](https://vasirbenchmark.com/#capabilities/ai-workflows) and [full benchmark report](https://vasirbenchmark.com/benchmark-report.html#work-spec-chat). Release `6e1e9f8f3711697e88d9cda30d22619ee1d08e2d7be0c083c65759aa9fb69fb3` passed exact verification of all 10 public files, 9 capability routes, 4 reports, HTTPS, and private-origin enforcement. All 317 repository tests, the registry check, 24 local browser checks, and 12 live desktop/mobile checks passed. The [publication receipt](../../.agents/vasir-evals/work-spec-chat/2026-09-05T05-06-00Z__chat__expanded-26/publication.json) records successful activation and lease release without rollback.
