# Completed creation benchmark — production release

Published on 8 September 2026 at 05:45:02 UTC. Independent production-browser verification passed at 05:45:43 UTC.

- [Writing benchmark list](https://vasirbenchmark.com/?writing=storytelling-magic-discovery#capabilities/writing/benchmarks)
- [First discovery of magic: answers, trials, and judgments](https://vasirbenchmark.com/benchmark-report.html#storytelling-magic-discovery/magic-discovery/trial-1)
- Release: `4632a18ef2b2da4500c3441e55ec8b99a028ef26920eb72c127fdedf7063ae4e`.
- Previous verified release: `c266a8d078add2906ac0074b4e76da1a0b0e6347dcbec52bcb22c0a7a9f965e0`.

## Complete cohort

33 model/reasoning configurations, three fresh trials, and two conditions produced 198 outlines. Four fresh blinded judge seats crossed Astra and Sol with skill-naive and skill-informed contexts: 396 paired requests, 792 answer assessments, and 7,920 dimension ratings. No final answer or judgment is missing or excluded. One operational creator startup failure was retried once; no completed answer was replaced. See the [runtime audit](runtime-audit.md).

| Judge context | Plain /100 | Skill /100 | Uplift |
| --- | ---: | ---: | ---: |
| Balanced four-seat panel | 81.9 | 92.0 | +10.1 |
| Skill-naive | 82.6 | 92.4 | +9.8 |
| Skill-informed | 81.2 | 91.6 | +10.4 |

The balanced panel favors the skill in 97 of 99 paired trials; two losses remain visible. All 33 configuration means improve. These are descriptive results for one brief, not a calibrated general-writing ranking. See the [full table](results/README.md) and [independent recomputation](results/insights.md).

## Reviewed and delivered bytes

The immutable 16-file release is 22,860,898 bytes, with 292,706 compressed landing bytes. Creation answers and original reviews use a separate lazy archive; neither response archive is required by the landing page. Review deduplication is lossless and preserves exact original output and prompt bytes.

The frozen candidate passed the complete benchmark browser checks at 1440×1000, 820×1000, and 390×844. The main agent inspected fresh screenshots before acceptance. The focused receipt retains 48 fresh screenshots and the previous 60 captures as explicitly historical evidence; it does not claim a fresh Games audit or fresh human screenshot approval.

The guarded copy-back preserved peer presentation bytes and added only the new review evidence and accepted receipt. The shared receipt test passed with all selected private source files present and verified. Private runtime archives remain outside Git; a fresh checkout can check tracked receipt/source metadata, but must restore the selected private snapshots to rebuild or publish. Publication still requires those source bytes.

The publisher used `fullAudit: false`: 17 fresh file checks, including one retained game isolation probe, and 526 unchanged retained assets reused. No exhaustive retained Games asset audit ran. The production origin remained private, activation succeeded, and the publication lease was released.

An independent, non-intercepted HTTPS browser check then passed 134 checks at 1440×1000, exercising all three trials, original answers and reviews, context comparison, and existing Writing navigation. Its six loaded application assets matched the reviewed release. The main agent also inspected the live benchmark list and report screenshots.

## Evidence fingerprints

- Tracked accepted receipt: `site/vasirbenchmark.com/template-lock.json`, SHA-256 `4e6993d70634837d634432943ccc3a15fe37675ac198756f07626923a014b1d8`.
- Tracked local browser proof: `site/vasirbenchmark.com/reviews/storytelling-magic-discovery/2026-09-08T05-39-14-674Z-MYmT2y/check.json`, SHA-256 `d1b851b684841023c5ddb524ca8ed29c744971eb8353c89d7624991232be1b2b`.
- Retained local live-proof receipt: `tmp/writing-magic-release/live-checks/2026-09-08T05-45-18-956Z-NhfDwi/check.json`, 9,043 bytes, SHA-256 `7dfa422ee0cc31842d5f03afbbd76815d4f601412a7c490eba34dbbdcb1c2888`.
- Retained live browser report: the same directory's `1440/writing-browsercheck.json`, 468,173 bytes, SHA-256 `465882fda5e1f12cf00d9e8456a996e074b0e5d97aafbcfa69ad5ec12ef0ce49`.

The local live-check receipts remain operational evidence under ignored `tmp/`; this document records their fingerprints without publishing private runtime metadata. The source selection, generated public data, original answer/review archive, code, and portable pre-publication browser evidence are tracked.
