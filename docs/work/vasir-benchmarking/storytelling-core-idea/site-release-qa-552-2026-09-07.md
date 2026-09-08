# Writing immutable-release QA — 552-answer snapshot

The final candidate passed 109 Writing checks at each of 1440 × 1000, 390 × 844, and 820 × 1000. Shared Overall desktop, Engineering report desktop, and AI Workflows inspector mobile checks also passed. This is a local immutable-delivery rehearsal, not a deployment or live-CDN verification.

The pinned source is `a81bd32da442d54c3d5296e74b0190fed8626ae9ce0aa51bbd7b3996eebd10ab`: one Core idea benchmark, 12 story cases, 33 model/reasoning settings, 792 declared answer slots, 552 completed answers, and 96 individual judge reviews from 48 matched-pair batches. There are zero complete two-judge panels, scored responses, or complete scored configurations. No missing result was replaced with a fixture or invented score.

## Candidate and budgets

Built with `buildBenchmarkPublicationArtifact({repoRootDirectory:'/Users/erikhazzard/code/vasir',validateAcceptance:false})`.

- Release: `6e041f8ed6128c656e4e179f4c83958cfd5b306435d68eeae3e028f5f720a838`
- Artifact: `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasirbenchmark-release.vtVIXP`
- Public files: 15.
- Total bytes: 11,061,724 of 16,777,216; 5,715,492 remain.
- Compressed landing bytes: 283,004 of 300,000; 16,996 remain.
- `writing-data.js`: 967,834 bytes; SHA-256 `9798b6878519d65a289fc9ce2bfae14c29b2b0c96275e363e00e762ce9f58c5b`.
- `writing-responses.js`: 1,983,955 bytes; SHA-256 `482532fa2a65dd00373dcf907427b4ff20c521b8084b69b6f7dde9e4ba5743a0`.

The ordinary 2 MiB and response-bundle 8 MiB limits also passed. The candidate includes the shared Games files unchanged by this QA task.

## Evidence exercised

Each Writing viewport checked all 552 exact final answers and saved question/instruction-message records, whitespace word counts, Unicode code-point character counts, per-answer execution labels and all eight saved usage fields. All 96 judge scores, ten-dimensional ratings and saved overall rationales matched their source records. A lone judge review stayed visibly separate from the absent panel score. Shared judge-batch resources retained their two-candidate scope and the explicit instruction to deduplicate by judge and prompt SHA-256.

All ten rubric dimensions exposed their exact 1/5/10 anchors in collapsed disclosures. All 23 frozen skill archive files rendered once; every disclosure opened its exact content and closed again without horizontal page overflow. Saved instruction links and recorded reference-file reads opened the matching shared archive. The report exposes recorded model/effort verification, runtime mode, fresh-session status, observed collaboration-event counts, raw-stream retention status, duration, and resource accounting without inferring the number of underlying agents. The usage disclosure warns that historical CLI normalizers synthesized some zero components; saved zero does not establish provider-reported zero.

The browser verified native Writing/Storytelling navigation, the one-benchmark/many-story hierarchy, unscored future Prose and Poetry subsections, selected-model story links, complete-corpus leaderboard eligibility, and the absent scored efficiency frontier. Writing remained outside Overall. Its projected Overall SHA-256 stayed `4b51cf8398cc2e019ce565508e664a41469a74a19054f0131702aa541a08f0a8` in all three viewports.

Visual inspection covered desktop/mobile answer and judgment layouts, execution details, resource accounting, rubric anchors, and the largest shared reference file. The primary answer remains readable with supporting evidence collapsed by default.

## Immutable delivery

The temporary server accepted HTML at the ordinary entrypoints and JavaScript/CSS only under `/releases/<release-id>/`. It verified every file's byte length and SHA-256 before delivery, using production MIME/cache headers, the actual apex CSP, `nosniff`, and no-referrer policy. The CSP SHA-256 was `624a9f0c9263671dc167be75d65b04901c77a59955f65289b3751d9d348aa245`.

All 114 observed local requests succeeded. All ten Writing-bundle requests used the exact immutable prefix; no JavaScript/CSS request used an apex path. Each Writing viewport recorded seven browser-loaded JavaScript bodies, all byte-for-byte equal to the candidate. Its Writing data loaded identically in the explorer and report. There were no browser/runtime/network failures or horizontal page overflows in the final checks. The temporary server was stopped; the candidate and receipts remain available.

## Compatibility fixes and regression checks

The shared capture harness initially rejected the new projection wrapper schema and still treated Writing as a disabled future category. Its schema allowlists now include version 6, and its native-category audit recognizes active, honestly unscored Writing. The keyboard sequence now includes Writing in both directions.

That keyboard test exposed a Writing-only focus issue: entering the short route and then canonicalizing it cleared the saved selector-focus state. Cross-category navigation now emits the canonical `/writing/storytelling` route immediately. The final shared Overall capture passed its complete keyboard cycle and synchronized pointer-guide check. Engineering's report passed exact-evidence checks and its Overall breadcrumb regression. The Workflows mobile inspector passed its existing exact-answer and independent-assessment checks. No context-reload architecture or Games behavior was rewritten.

`node --test test/writing-publication.test.js` passed 71 tests. `node --test test/source-style.test.js`, JavaScript syntax checks, and scoped `git diff --check` also passed.

## Receipts and captures

Proof directory: `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasir-writing-release-proof.SM7X4b`

- `candidate.json`: complete candidate file inventory, hashes, source identity and budgets.
- `requests.json`: actual delivered paths, bytes and hashes.
- `proof.json`: assertions joining all three browser receipts and delivered files to the immutable candidate, plus shared regression capture hashes.
- `desktop/writing-browsercheck.json`, `mobile/writing-browsercheck.json`, `tablet/writing-browsercheck.json`: 109 checks, all-case evidence counts, loaded-byte hashes, and 12 captures each.
- Recommended visual review: `mobile/writing-answer.png`, `mobile/writing-judgments.png`, `mobile/writing-execution.png`, `mobile/writing-judge-resources.png`, `mobile/writing-method-execution.png`, `mobile/writing-reference.png`, and `desktop/writing-rubric-anchors.png`.
- Shared regressions: `overall-desktop.png`, `engineering-report-desktop.png`, and `workflow-inspector-mobile.png`.

The final harness hashes are `8d8b407eba33ec15027c11ccc119f531dd9072202948009d6db5792732f395b0` for Writing and `81e8fafebc1859b387b0469b5172c2f7825263c29c84766d42af3f8ef9d4aa8b` for shared captures. These supersede the earlier 552-answer rehearsal receipts ending in `e9jcDp`, whose public asset candidate predates the focus fix.

## Still untested with real Writing data

- Full two-judge panel totals and numerical judge disagreement.
- Complete-corpus ranks, leaders, paired deltas, and a populated score/resource frontier.
- Completed Claude answer/runtime variants; those answer slots remain pending in this snapshot.
- Uploaded assets, live CDN delivery, and renewal of the shared source/capture acceptance lock under the user's existing publication authority.

Projection unit tests cover scoring arithmetic, but they do not substitute for scored browser evidence. No acceptance-lock changes, deployment, commit, or push were performed in this QA task.
