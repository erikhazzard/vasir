# First discovery of magic — creation benchmark

Write a synopsis or short outline for an original fantasy novel set in a world that has only just discovered magic—akin to humans first encountering AI and large language models. Make it a compelling story, not just a description of the world. Include the ending.

33 exact model settings × 3 fresh trials × 2 conditions. 198/198 final answers; 792/792 answer assessments. Four fresh blind seats cross two judge models with skill-naive and skill-informed context.

Scores are the equal mean of four ten-dimension reviews, then the mean of three complete paired trials. Missing results remain unranked, not zero. Naive means no supplied skill context in this experiment, not absence of prior training exposure.

| Rank | Model setting | Plain /100 | Skill /100 | Uplift |
| --- | --- | ---: | ---: | ---: |
| 1 | GPT-6 Astra · high | 92.3 | 97.9 | +5.7 |
| 1 | GPT-6 Astra · xhigh | 95.2 | 97.9 | +2.8 |
| 3 | GPT-6 Astra · max | 95.3 | 97.8 | +2.5 |
| 4 | GPT-6 Astra · ultra | 96.2 | 97.2 | +1.0 |
| 5 | GPT-6 Astra · medium | 93.3 | 97.1 | +3.8 |
| 6 | Claude Fable 5.1 · max | 92.4 | 96.6 | +4.2 |
| 7 | Claude Opus 5 · max | 87.2 | 96.3 | +9.1 |
| 8 | GPT-6 Astra · low | 91.8 | 96.1 | +4.3 |
| 9 | Claude Fable 5.1 · xhigh | 88.4 | 95.8 | +7.3 |
| 9 | GPT-5.6 Sol · max | 81.1 | 95.8 | +14.7 |
| 11 | GPT-5.6 Sol · ultra | 82.5 | 95.1 | +12.6 |
| 12 | Claude Opus 5 · xhigh | 87.8 | 94.5 | +6.8 |
| 13 | Claude Fable 5.1 · high | 86.5 | 94.3 | +7.8 |
| 14 | Claude Opus 5 · high | 85.9 | 93.8 | +7.8 |
| 15 | Claude Opus 5 · medium | 81.8 | 93.6 | +11.8 |
| 16 | Claude Fable 5.1 · medium | 86.0 | 93.1 | +7.1 |
| 17 | GPT-5.6 Sol · high | 74.8 | 92.8 | +18.0 |
| 18 | GPT-5.6 Sol · medium | 75.3 | 91.9 | +16.7 |
| 18 | GPT-5.6 Terra · ultra | 77.8 | 91.9 | +14.1 |
| 20 | Claude Opus 5 · low | 80.2 | 91.7 | +11.5 |
| 20 | GPT-5.6 Sol · xhigh | 76.8 | 91.7 | +14.9 |
| 22 | GPT-5.6 Luna · max | 79.8 | 91.6 | +11.8 |
| 23 | Claude Fable 5.1 · low | 80.8 | 91.1 | +10.3 |
| 24 | GPT-5.6 Terra · xhigh | 69.1 | 89.8 | +20.8 |
| 25 | GPT-5.6 Luna · xhigh | 78.8 | 89.6 | +10.8 |
| 26 | GPT-5.6 Terra · max | 80.8 | 88.8 | +8.0 |
| 27 | GPT-5.6 Sol · low | 74.8 | 88.6 | +13.8 |
| 28 | GPT-5.6 Terra · medium | 73.8 | 86.5 | +12.8 |
| 29 | GPT-5.6 Luna · high | 71.6 | 85.8 | +14.3 |
| 30 | GPT-5.6 Luna · medium | 71.4 | 83.8 | +12.4 |
| 31 | GPT-5.6 Terra · low | 69.1 | 83.5 | +14.4 |
| 32 | GPT-5.6 Terra · high | 70.7 | 82.2 | +11.5 |
| 33 | GPT-5.6 Luna · low | 72.9 | 81.3 | +8.4 |

## Interpretation limits

- One fixed fantasy-creation prompt and three trials per configuration cannot establish general writing ability or support precise inferential claims.
- A skill-naive judge receives no skill context here; its prior training exposure is unknown. Two context seats share each canonical judge model and are not independent model families.
- Style and candidate self-disclosures can imply a generation condition despite hidden labels; blindness is procedural rather than guaranteed.
- Informed judges receive a fixed root-plus-eight-reference pack; creators have progressive access to the entire frozen skill. Their actual exposure may differ.
- Quota or provider failures affect coverage and must remain visible; they do not authorize shrinking the frozen inventory or selecting replacement stories for quality.
- Three trials on one exact prompt support descriptive repeat variation, not confidence intervals or significance claims.
- The four review seats cross two related model families with two context conditions; they are not four independent training sources.
- Incomplete paired configurations have no aggregate score or rank. Missing answers and reviews are never imputed.

The JSON companion retains separate context means and all three raw trial differences with descriptive variation. No confidence interval, statistical-significance claim, or general-writing ranking is inferred from this single brief.

Original outlines, exact judge reviews, frozen skill context, and losslessly reconstructed judge prompts are available in the [live benchmark report](https://vasirbenchmark.com/benchmark-report.html#storytelling-magic-discovery/magic-discovery/trial-1). Failed attempts are retained in the source evidence. See the separate [verified release record](../release.md).
