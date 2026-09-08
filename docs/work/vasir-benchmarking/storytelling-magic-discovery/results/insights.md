# Independent quantitative check: Magic Discovery

Completed cohort, 8 September 2026. This is an arithmetic audit and descriptive interpretation, not a new scoring pass. It changes no generation, judge record, source selection, or public score.

## Findings

The equal-weight four-seat panel scored plain answers **81.87/100** and skill-assisted answers **91.98/100**, a **+10.11-point** paired mean difference. All 33 settings improved on their three-trial means. Across the 99 matched setting/trial pairs, the skill condition had **97 wins, 0 ties, and 2 losses**. These counts compare panel totals, not optional judge winner labels.

The gain is present in both context groups, so it is not confined to judges explicitly shown the skill reference pack. Skill-naive judges measured +9.81 points; skill-informed judges measured +10.40. The difference between those estimated lifts is +0.60 points. Informed seats scored both arms lower on average: -1.43 for plain and -0.83 for skill-assisted answers. This describes context sensitivity; it is not evidence that the two profiles of a model are independent model families.

The largest dimension gains were resistance and relationships (+1.81/10), desire and stakes (+1.54/10), and earned ending (+1.39/10). Discovery-premise integration and synopsis clarity already had high plain-arm averages and changed comparatively little. Magic coherence (8.21/10) and earned ending (8.45/10) remained the two lowest skill-arm dimension averages. These are differences in rubric ratings, not independently established explanations of how the skill works.

## Panel and context views

Scores sum ten integer ratings per judge, then average across the designated seats. Each setting and trial receives equal weight; model families with six planned settings therefore contribute more pairs than families with five. All views below use the same 99 fully scored pairs.

| Scoring panel | Plain /100 | Skill /100 | Lift | Wins / ties / losses |
| --- | ---: | ---: | ---: | --- |
| Balanced four seats | 81.87 | 91.98 | +10.11 | 97 / 0 / 2 |
| Two skill-naive seats | 82.59 | 92.39 | +9.81 | 96 / 0 / 3 |
| Two skill-informed seats | 81.16 | 91.56 | +10.40 | 97 / 0 / 2 |
| astra-xhigh-naive | 77.87 | 88.80 | +10.93 | 98 / 0 / 1 |
| astra-xhigh-informed | 77.04 | 88.14 | +11.10 | 97 / 0 / 2 |
| sol-xhigh-naive | 87.30 | 95.99 | +8.69 | 91 / 2 / 6 |
| sol-xhigh-informed | 85.27 | 94.98 | +9.71 | 94 / 3 / 2 |

Judge-model scale differences are material: Sol assigns higher absolute scores than Astra to the same answer cohort. The four-seat average deliberately balances the two models and the two context profiles; it does not calibrate either model against human readers.

## High, low, and variable settings

GPT-6 Astra high and xhigh tie for the highest skill-arm mean (97.92), followed closely by Astra max (97.83). The high-versus-max gap is only 0.08 points; three trials do not establish a reliable ordering among these near-ceiling settings. Astra ultra has the highest plain-arm setting mean (96.17) and the smallest measured gain (+1.00).

GPT-5.6 Terra xhigh has the largest measured gain (+20.75), but its trial differences are +19.75, +31.25, and +11.25 points, with sample standard deviation 10.04 and range 11.25–31.25. GPT-5.6 Sol high is next (+18.00). The lowest skill-arm mean is GPT-5.6 Luna low (81.33), followed by Terra high (82.17); both still improve on their own plain-arm means.

The two panel-scored losses remain included:

| Setting | Trial | Plain /100 | Skill /100 | Difference |
| --- | ---: | ---: | ---: | ---: |
| GPT-6 Astra · ultra | 1 | 98.25 | 97.50 | -0.75 |
| GPT-5.6 Terra · max | 2 | 87.00 | 86.50 | -0.50 |

## Dimension differences

Each criterion is rated from 1 to 10. Because all ten have equal weight, a one-point criterion change contributes one point to the 100-point sum. All ten means increased; that does not mean every answer improved on every dimension.

| Dimension | Plain /10 | Skill /10 | Difference |
| --- | ---: | ---: | ---: |
| Resistance and relationships | 7.19 | 8.99 | +1.81 |
| Desire and stakes | 7.95 | 9.49 | +1.54 |
| Earned ending | 7.07 | 8.45 | +1.39 |
| Causal progression | 7.99 | 9.13 | +1.14 |
| Character agency | 8.62 | 9.71 | +1.08 |
| Thematic consequences | 8.47 | 9.54 | +1.07 |
| Magic coherence | 7.22 | 8.21 | +0.99 |
| Originality and specificity | 8.24 | 9.15 | +0.90 |
| Discovery premise | 9.83 | 9.94 | +0.11 |
| Synopsis clarity | 9.29 | 9.36 | +0.07 |

## All 33 settings

Each row contains all three planned trials. Trial differences are exact quarter-point four-seat averages; means and sample standard deviations are rounded to two decimals for arithmetic comparison, not to imply statistical certainty. SD is descriptive sample SD with divisor 2. The interval shown is the observed minimum–maximum, not a confidence interval.

| Setting | Plain mean | Skill mean | Mean lift | Trial 1 / 2 / 3 lift | Lift SD | Observed lift range | Naive lift | Informed lift |
| --- | ---: | ---: | ---: | --- | ---: | --- | ---: | ---: |
| GPT-6 Astra · low | 91.75 | 96.08 | +4.33 | +6.00 / +4.50 / +2.50 | 1.76 | 2.50–6.00 | +3.50 | +5.17 |
| GPT-6 Astra · medium | 93.25 | 97.08 | +3.83 | +2.00 / +6.00 / +3.50 | 2.02 | 2.00–6.00 | +4.00 | +3.67 |
| GPT-6 Astra · high | 92.25 | 97.92 | +5.67 | +7.25 / +6.00 / +3.75 | 1.77 | 3.75–7.25 | +5.33 | +6.00 |
| GPT-6 Astra · xhigh | 95.17 | 97.92 | +2.75 | +0.75 / +4.00 / +3.50 | 1.75 | 0.75–4.00 | +2.00 | +3.50 |
| GPT-6 Astra · max | 95.33 | 97.83 | +2.50 | +4.50 / +1.50 / +1.50 | 1.73 | 1.50–4.50 | +3.00 | +2.00 |
| GPT-6 Astra · ultra | 96.17 | 97.17 | +1.00 | -0.75 / +2.75 / +1.00 | 1.75 | -0.75–2.75 | +0.50 | +1.50 |
| GPT-5.6 Sol · low | 74.83 | 88.58 | +13.75 | +13.75 / +14.00 / +13.50 | 0.25 | 13.50–14.00 | +13.33 | +14.17 |
| GPT-5.6 Sol · medium | 75.25 | 91.92 | +16.67 | +13.50 / +21.00 / +15.50 | 3.88 | 13.50–21.00 | +16.17 | +17.17 |
| GPT-5.6 Sol · high | 74.83 | 92.83 | +18.00 | +17.75 / +13.75 / +22.50 | 4.38 | 13.75–22.50 | +18.50 | +17.50 |
| GPT-5.6 Sol · xhigh | 76.75 | 91.67 | +14.92 | +9.50 / +22.75 / +12.50 | 6.95 | 9.50–22.75 | +14.00 | +15.83 |
| GPT-5.6 Sol · max | 81.08 | 95.75 | +14.67 | +19.00 / +13.25 / +11.75 | 3.83 | 11.75–19.00 | +14.50 | +14.83 |
| GPT-5.6 Sol · ultra | 82.50 | 95.08 | +12.58 | +13.50 / +12.00 / +12.25 | 0.80 | 12.00–13.50 | +11.83 | +13.33 |
| GPT-5.6 Terra · low | 69.08 | 83.50 | +14.42 | +17.25 / +7.00 / +19.00 | 6.48 | 7.00–19.00 | +14.00 | +14.83 |
| GPT-5.6 Terra · medium | 73.75 | 86.50 | +12.75 | +13.25 / +12.50 / +12.50 | 0.43 | 12.50–13.25 | +12.83 | +12.67 |
| GPT-5.6 Terra · high | 70.67 | 82.17 | +11.50 | +15.25 / +8.75 / +10.50 | 3.36 | 8.75–15.25 | +11.50 | +11.50 |
| GPT-5.6 Terra · xhigh | 69.08 | 89.83 | +20.75 | +19.75 / +31.25 / +11.25 | 10.04 | 11.25–31.25 | +21.33 | +20.17 |
| GPT-5.6 Terra · max | 80.83 | 88.83 | +8.00 | +15.25 / -0.50 / +9.25 | 7.95 | -0.50–15.25 | +7.50 | +8.50 |
| GPT-5.6 Terra · ultra | 77.83 | 91.92 | +14.08 | +12.25 / +22.00 / +8.00 | 7.18 | 8.00–22.00 | +14.17 | +14.00 |
| GPT-5.6 Luna · low | 72.92 | 81.33 | +8.42 | +12.50 / +3.25 / +9.50 | 4.72 | 3.25–12.50 | +8.33 | +8.50 |
| GPT-5.6 Luna · medium | 71.42 | 83.83 | +12.42 | +10.75 / +15.25 / +11.25 | 2.47 | 10.75–15.25 | +11.83 | +13.00 |
| GPT-5.6 Luna · high | 71.58 | 85.83 | +14.25 | +13.00 / +12.50 / +17.25 | 2.61 | 12.50–17.25 | +13.83 | +14.67 |
| GPT-5.6 Luna · xhigh | 78.75 | 89.58 | +10.83 | +14.00 / +11.00 / +7.50 | 3.25 | 7.50–14.00 | +10.67 | +11.00 |
| GPT-5.6 Luna · max | 79.75 | 91.58 | +11.83 | +15.50 / +9.25 / +10.75 | 3.26 | 9.25–15.50 | +11.33 | +12.33 |
| Claude Fable 5.1 · low | 80.83 | 91.08 | +10.25 | +8.75 / +11.00 / +11.00 | 1.30 | 8.75–11.00 | +9.33 | +11.17 |
| Claude Fable 5.1 · medium | 86.00 | 93.08 | +7.08 | +10.75 / +2.00 / +8.50 | 4.54 | 2.00–10.75 | +6.83 | +7.33 |
| Claude Fable 5.1 · high | 86.50 | 94.25 | +7.75 | +8.50 / +12.25 / +2.50 | 4.92 | 2.50–12.25 | +7.50 | +8.00 |
| Claude Fable 5.1 · xhigh | 88.42 | 95.75 | +7.33 | +9.50 / +6.25 / +6.25 | 1.88 | 6.25–9.50 | +7.83 | +6.83 |
| Claude Fable 5.1 · max | 92.42 | 96.58 | +4.17 | +2.25 / +3.00 / +7.25 | 2.70 | 2.25–7.25 | +3.50 | +4.83 |
| Claude Opus 5 · low | 80.17 | 91.67 | +11.50 | +8.50 / +11.00 / +15.00 | 3.28 | 8.50–15.00 | +10.67 | +12.33 |
| Claude Opus 5 · medium | 81.75 | 93.58 | +11.83 | +6.75 / +11.00 / +17.75 | 5.55 | 6.75–17.75 | +11.00 | +12.67 |
| Claude Opus 5 · high | 85.92 | 93.75 | +7.83 | +5.25 / +7.75 / +10.50 | 2.63 | 5.25–10.50 | +8.00 | +7.67 |
| Claude Opus 5 · xhigh | 87.75 | 94.50 | +6.75 | +10.75 / +5.75 / +3.75 | 3.61 | 3.75–10.75 | +6.33 | +7.17 |
| Claude Opus 5 · max | 87.17 | 96.25 | +9.08 | +5.25 / +14.25 / +7.75 | 4.65 | 5.25–14.25 | +8.67 | +9.50 |

## Independent recomputation and provenance

The check started only after all 396 judge requests were complete. It parsed each retained judge `outputText` JSON independently of saved totals, verified its SHA-256, checked all ten integer ratings, mapped A/B through `candidateOrder`, and matched the referenced generator answer SHA-256. It then summed 792 answer assessments and averaged the four seats into 198 answer scores. No error or missing-score imputation was used; this completed cohort has no excluded pairs or terminal generation/judgment failures.

The independent totals matched every retained judged answer and the selected publication projector: **198 answer totals, 1,980 averaged dimension values, all 33 setting means in both arms, both context-specific setting means, the balanced and context summary means, and win/tie/loss counts**. Public summary values use one-decimal rounding. This check is independent arithmetic over the same generated evidence, not an independent replication of the experiment.

Source selection: [publication.json](../../../../../benchmarks/storytelling-magic-discovery/publication.json). The selected immutable snapshot directory is `.agents/vasir-evals/storytelling-magic-discovery/publication-snapshots/48fadf69fb9904e198ebfc61d892db9e6f4a8ea2e36c35c2ad72c8e7853b7168/`.

- Run SHA-256: `233db3f8cf5c4db8ddd6432ff7323d7be567a46654213f9a00a148e04329a18f`.
- Raw judging SHA-256: `927abaeb682628de190bc609bd999c23a5be33e260ce3a989b10283a2b49f138`.
- Judge-context snapshot SHA-256: `ecbc9f56410245065b6d160c0a6f411ed2a5dcafab13a805efd1950b43d3e9fe`.

## Claim boundary

This is one fantasy synopsis/outline prompt, three trials per configuration, one frozen storytelling-skill version, and two judge models crossed with two context profiles. The four seats are not four independently trained models. They are fresh contexts using two models; model-family overlap with generators, style-based condition inference, judge preferences, and high-score ceiling effects remain possible. Human calibration is pending.

No confidence interval, significance claim, universal skill benefit, monotonic reasoning-effort claim, or general writing/prose-quality ranking follows from this cohort. The prompt requested a synopsis or short outline, not finished scenes or polished novel prose. Apparent changes in length, latency, or usage are separate outcomes and were not controlled or analyzed here. Positive context-naive results do not establish the absence of all judge bias.

These results validate neither repository acceptance nor deployment. Browser review and live delivery require their own fresh evidence.
