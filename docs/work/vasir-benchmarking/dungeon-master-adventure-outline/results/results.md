# Dungeon Master adventure-outline benchmark

Run: dm-outline-v1-2026-09-08. 16/16 matched pairs have both blind reviews. Scores are out of 100; primary-prompt results determine the headline score.

| Prompt | Pairs | Plain | With skill | Difference | Judge preferences: skill / tie / plain |
| --- | ---: | ---: | ---: | ---: | ---: |
| Open adventure outline | 6/6 | 91.9 | 95.3 | +3.3 | 6 / 6 / 0 |
| Mountain caravan | 2/2 | 89.2 | 85.0 | -4.2 | 0 / 1 / 3 |
| Orbital salvage | 2/2 | 91.7 | 94.2 | +2.5 | 4 / 0 / 0 |
| Neighborhood celebration | 2/2 | 95.0 | 95.0 | 0.0 | 0 / 4 / 0 |
| Weather station horror | 2/2 | 97.5 | 99.2 | +1.7 | 2 / 2 / 0 |
| Mechanical structure | 2/2 | 92.5 | 93.3 | +0.8 | 2 / 1 / 1 |

Equal-weight mean across the five transfer prompts: plain 93.2 → skill 93.3 (+0.2 points). This diagnostic does not enter the primary headline score. Differences are calculated before rounding.

Preference counts are individual judge decisions, two per matched pair. They are not additional writing samples. Each pair's order is reversed for the second judge. Disagreements remain in the raw records.

## Length and latency

| Prompt | Plain words | Skill words | Plain seconds | Skill seconds |
| --- | ---: | ---: | ---: | ---: |
| Open adventure outline | 490.8 | 555.0 | 167.4 | 185.3 |
| Mountain caravan | 713.5 | 710.5 | 131.6 | 166.3 |
| Orbital salvage | 693.5 | 1001.0 | 161.6 | 237.2 |
| Neighborhood celebration | 677.5 | 739.5 | 123.7 | 163.8 |
| Weather station horror | 799.0 | 865.0 | 219.9 | 257.7 |
| Mechanical structure | 860.0 | 908.5 | 191.4 | 281.4 |

## Limits

- One requested generator model and effort: Astra Ultra.
- Both independent judge seats use Astra Ultra; no human or different-model calibration.
- Absolute scores are assessed within a blinded pair; pair order is counterbalanced.
- No length cap; effects include extra context and reference-reading work.
- Six primary repetitions and two per secondary prompt do not establish universal or live-table performance.
- Baseline and treatment are independently sampled; individual differences also reflect generation variation.
- Fifteen of sixteen skill answers have complete required-reference proof. Primary repetition 3 has only 2/3 chunks proved in returned tool output; its original answer is retained under the frozen intention-to-invoke analysis.
- The original run incurred 23 quota failures; its adapter retried ten failed judge seats once despite the frozen no-quota-retry rule. The execution audit preserves those attempts and the later explicit recovery; no successful answer was rerolled.
