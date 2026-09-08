# Interim Writing failure-state QA: 790 answers

Diagnostic only. This real snapshot was selected by the root coordinator while production judging continued. It is not the final scored source, a renewed acceptance receipt, a deployment, or live-CDN proof.

## Result

The immutable candidate passed 118 Writing browser checks at each of 1440×1000, 820×1000, and 390×844. Each receipt contains the unchanged 13 canonical screenshots plus four supplementary failure/retained-answer screenshots. All 792 judgment headings were compared with their actual matched source state. Exactly four cells display “Not scored”: the two terminal failures and their two completed plain counterparts. Genuine pending and partial-review headings remain unchanged.

The source contains 790 of 792 final answers, 566 individual judgments, 14 complete two-judge answer panels, seven usable scored pairs, and zero complete configurations. All twelve cases and 33 settings remain visible. This exercised real panel arithmetic, disagreements, and per-story paired summaries, but not complete-corpus leaderboard ranks, populated efficiency frontiers, ties, or regressions. Writing remains excluded from Overall.

The two `The Matrix` / Storytelling skill failures are `claude:claude-opus-5@xhigh` and `claude:claude-opus-5@max`. Each preserves its single failed attempt, empty answer, no judgments, and null score. Their source-exact public label is “Provider output filtering blocked the response; no final answer was returned or scored.” The plain answers remain available and unscored, at 349 and 389 words respectively. No attempt was retried or rerouted.

## Candidate and immutable delivery

- Selected source SHA-256: `50742cb6841f49f00e49ffdab78efad8cafca3b6af33dbc08045dd93165b03a9`.
- Release ID: `634bd6df326745c2ca12e80f35da0b51f2c48284354758aeca1b3c08586d65c7`.
- Artifact directory: `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasirbenchmark-release.0jPh3s`.
- Diagnostic metadata: `/Users/erikhazzard/code/vasir/tmp/writing-interim-filter-proof.ckyCFo/candidate.json`; SHA-256 `5a881aad11fdfa8bd9ae45f7d52b18a327e071995ba3716c3167edda41503087`.
- Aggregate proof: `/Users/erikhazzard/code/vasir/tmp/writing-interim-filter-proof.ckyCFo/rehearsal/rehearsal.json`; SHA-256 `e61ddcef1aaf8b4a3926011b9ec0e09006704d398a62f3635a572e0fe3851675`.

The ordinary artifact builder used `validateAcceptance: false`; the final scored-candidate helper was not used. The existing `rehearse.mjs --diagnostic-unscored` helper served candidate HTML verbatim and immutable assets only through the exact release prefix, with current production apex security headers copied to loopback HTTP. All 40 transport checks passed. Its 81 browser requests had zero failures and zero apex JS/CSS requests; all seven browser-loaded JavaScript observations per viewport matched candidate bytes and hashes. The local server was stopped after proof.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `writing-data.js` | 962,923 | `0a2a1b4f90ffe0fabdef2ed1bfd6d25544d29171871835d4d307abf1ec0dfd7e` |
| `writing-responses.js` | 3,479,484 | `7af1a8b4dfe1a9e3f2603e8b1eaefc572f15d7249b4ad7c9873aa224e41ecde9` |
| `benchmark-report.js` | 64,519 | `a4ca9cd8d582a475b7a8b7f20ff67ad85596328e709523e81036686b335fe8e9` |

All 15 public files total 12,552,743 bytes, leaving 4,224,473 bytes under the 16 MiB artifact limit. Compressed landing dependencies total 283,011 bytes, leaving 16,989 under the 300,000-byte limit. Both response bundles remain within their separate 8 MiB limits. These are this diagnostic candidate's measurements, not estimates for the final judged snapshot.

## Receipts and visual review

Viewport receipts are beneath the aggregate proof's directory:

| Viewport | Receipt | SHA-256 |
| --- | --- | --- |
| Desktop | `desktop/writing-browsercheck.json` | `2c741fbb63ff37d7cfd21e579d331fd3df0239b16c583ca75fa5a1e3e025324f` |
| Tablet | `tablet/writing-browsercheck.json` | `c495bf7ee2b97bb7f810d7c9bba63a130358f8844df19fe550a5b296bcbf061d` |
| Mobile | `mobile/writing-browsercheck.json` | `4436af5bd6d595960e36ac349df7ae8d67cc09347d10448bd49b8c35ac40c350` |

The browser harness SHA-256 is `42b80d74534e19b03735f7715f417254b86524b1e830574f65115fa8d06cc605`; the rehearsal helper SHA-256 is `86d69e2649f8c4bfee52de578b050300ced46643edb9243d79a5e0a5669eeb41`. The copied apex CSP SHA-256 remains `624a9f0c9263671dc167be75d65b04901c77a59955f65289b3751d9d348aa245`. Browser-observed Overall SHA-256 remains `4b51cf8398cc2e019ce565508e664a41469a74a19054f0131702aa541a08f0a8`.

The site agent visually inspected all eight unique supplementary images: both two-column pairs at desktop/tablet, and all four separate mobile states. The exact failure reason, model/effort identity, “Not scored” heading, null score, and retained plain-answer text are readable without clipping or horizontal overflow. At desktop/tablet the two condition captures share an image because both columns are visible simultaneously; their hashes confirm that duplication.

The four mobile review paths under `rehearsal/mobile/` are:

- `writing-failure-the-matrix-claude-claude-opus-5-max-skill-failed-response.png`
- `writing-failure-the-matrix-claude-claude-opus-5-max-baseline-retained-paired-response.png`
- `writing-failure-the-matrix-claude-claude-opus-5-xhigh-skill-failed-response.png`
- `writing-failure-the-matrix-claude-claude-opus-5-xhigh-baseline-retained-paired-response.png`

Every supplementary PNG is hash-verified in the corresponding receipt's `failureScreenshots`; no supplementary path was added to the 13 canonical captures or the shared acceptance list.

## Scope and remaining work

The first diagnostic rehearsal (`tmp/writing-interim-filter-proof.uctdq0`) exposed “Judgments pending” on terminally failed answers. The root authorized a narrow renderer fix, including retained completed counterparts. The second candidate and receipts above verify that fix on the identical selected source. `caseEvidence[].terminalJudgmentLabels` records the four source-derived outcomes in addition to the existing exact failure records.

The 87 Writing publication tests plus source-style check passed; syntax and scoped diff checks passed. Rechecks confirmed that the selected-source pointer, all four generated bundles, and acceptance lock retained their original bytes throughout this task. Only the renderer, browser assertions, and documentation changed. No scores, run data, corpus, Games evidence, shared acceptance, or production state were changed. Final fully judged source selection, complete-configuration QA, full screenshot review, acceptance renewal, and deployment remain with the root coordinator.
