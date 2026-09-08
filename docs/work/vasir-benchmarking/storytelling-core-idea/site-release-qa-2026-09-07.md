# Writing immutable-release browser rehearsal — 2026-09-07

The current candidate passed the Writing browser checks at 1440 × 1000 and 390 × 844 under its release-qualified asset URLs and the production apex content security policy.

The source snapshot contains one Core idea benchmark, 12 story cases, 33 model settings, 792 declared response slots, 96 completed answers, and zero scored answers. Each viewport passed 43 checks covering all 12 cases and the exact 96 saved answers. Judgment rendering with completed ratings and the Writing score/resource frontier still require a scored snapshot.

## Candidate and budgets

- Release: `cbdd40f0932d51251591486b911dc782975099985ecc441fb97dcf0416832547`
- Built with `buildBenchmarkPublicationArtifact({repoRootDirectory:'/Users/erikhazzard/code/vasir',validateAcceptance:false})`.
- Artifact directory: `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasirbenchmark-release.TQ2y49`
- Public files: 15.
- Total site bytes: 9,770,401 of 16,777,216.
- Compressed landing bytes: 282,988 of 300,000; 17,012 bytes remain.
- Writing data: 981,543 bytes. Writing responses: 686,465 bytes.

## Delivery evidence

A temporary local server served the candidate's HTML entrypoints at their ordinary paths and served immutable dependencies only under `/releases/<release-id>/`. Requests for JavaScript or CSS at the apex paths were rejected. Every served file was checked against its candidate byte length and SHA-256 before delivery. The server used the current production apex CSP, MIME types, immutable cache policy, `nosniff`, and the no-referrer policy.

The browser made 54 requests, all successful. All six Writing bundle requests used the exact release prefix; there were no apex bundle requests. Seven browser-loaded JavaScript bodies per viewport matched their artifact hashes. The Writing data bytes stayed identical between explorer and report, and response provenance matched the projected source fingerprint. The Overall projection hash remained `4b51cf8398cc2e019ce565508e664a41469a74a19054f0131702aa541a08f0a8` in both viewports.

There were no browser runtime failures, network failures, or horizontal page overflows. The temporary server was stopped after the checks. The candidate and receipts remain available for review.

## Receipts and captures

Proof directory: `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasir-writing-release-proof.jfcyZQ`

- `candidate.json` — candidate files, digests, budgets, and CSP digest.
- `requests.json` — the actual local request paths, returned bytes, and file digests.
- `proof.json` — assertions joining browser-loaded bytes to the immutable artifact.
- `desktop/writing-browsercheck.json` and `mobile/writing-browsercheck.json` — per-viewport checks and per-story evidence coverage.
- Each viewport directory contains `writing-models.png`, `writing-benchmarks.png`, `writing-efficiency.png`, `writing-report.png`, `writing-method.png`, and `writing-answer.png`.

This proves the local candidate's immutable URL resolution and browser behavior. It does not prove uploaded files, live CDN delivery, or model-judged quality. No deployment or acceptance-lock changes were made by this rehearsal.
