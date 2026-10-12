# EVAL PLAN — Test authoring

**Human Read:** All eight authors and both reviews are complete. Individual test-authoring results remain unchanged, with a mean +8.96875-point gain. Engineering includes all 53 scored models, averaging each model’s available benchmark pairs; Overall includes all 56 using the 50/25/25 priorities normalized across measured categories. Every row shows completed/expected task counts. Both tables are published and verified live. No new model runs or judgments were needed.

## Proof capsule

- Updated: 2026-10-11. Owner: root.
- Work spec: [work-spec.md](work-spec.md).
- Warrant: fixture calibration, paid native sessions, independent ratings and live publication need shared frozen inputs and durable receipts.
- Next action: User review of the restored live tables; no model calls remain. Opus author and reviewer receipts verify the requested account.
- Claim boundary: one service-boundary task, one attempt per model/condition; no browser E2E, general ranking, or human taste acceptance.

## Material risks and proof stack

| Risk | Sufficient evidence |
| --- | --- |
| Tautological tests receive fault credit; startup failures look like detection | Healthy/reference and negative controls; only source-confirmed failures caused by the injected fault in cases passing both healthy runs count; error class is irrelevant |
| Models receive different source or see private faults | Frozen paired prompts, hidden private config, immutable native receipts, isolated execution |
| Subjective ratings or weights are altered to favor a model | Predetermined additive rubric, two blind native reviews, exact citation validation and independent recomputation |
| Public table contradicts native evidence or changes incumbent results | Pinned projection, old-data equality, browser source inspection and canonical live byte checks |

## Objective gates

### TESTAUTHOR__M1__G1 — Qualified instrument

- Claim: the instrument distinguishes healthy queue behavior, six known behavioral faults and uninformative tests.
- Lie: copied logic, hook errors or shared Redis contamination produce false detection.
- Setup: frozen real queue source and dependencies, owned ephemeral Redis, private configuration and calibration suite; no production backend writes.
- Action: reference suite twice healthy and once per fault; tautological/smoke control and hook-failure control; sandbox probe.
- Observation/verdict: healthy reference passes; each fault produces a matched assertion failure; weak tests receive no fault credit; hook failure receives no detection; private config and source writes inaccessible to submissions.
- Authority/basis: pinned backend source, real Redis, existing fixture/replay code plus bounded new case.
- Potency: six surgical faults frozen before authors: FIFO reversal, lost expired work, expired receipt settlement, retry ordering, omitted in-flight count, omitted malformed-job quarantine.
- Blind spot: finite fault set does not establish total correctness or SQS behavior.
- Loop: missing harness `benchmarks/test-authoring/prepare.mjs` and calibration command.
- State: Objectively Green. Receipt: `calibration/calibration.json` in the private round; root reviewed 2026-10-10. Six reference cases passed twice and after restoring source. All six faults produced matched behavioral assertion failures; the tautological control caught 0/6 and setup failure earned no detection. Isolation and cleanup passed. Scope remains the stated standalone Redis boundary.
- Stop: invalid fault, flaky healthy reference, leakage or detection unsupported by source causality; repair instrument before native generation.

### TESTAUTHOR__M1__G2 — Faithful paired comparison

- Claim: eight native authored files and two blind reviews yield scores under unchanged weights, without source repair or outcome selection.
- Lie: hidden retries, changed task, copied existing tests, invented grades, stale skill snapshot or unresolved infrastructure scored as model failure.
- Setup: G1 qualified; frozen task, source, three-file skill snapshot, rubric, model IDs and bounds; one exact new `.spec.js` per response.
- Action: complete the author inventory without rerunning completed requests; reuse qualified replays, execute remaining files, then blind both reviewers, validate line evidence and independently recompute.
- Observation/verdict: exact receipts and usage for every attempt; treatment is the only paired prompt difference; source and reviewer bytes unmodified; ratings complete or visibly unresolved; declared arithmetic reproduced.
- Authority/basis: native receipts, unchanged weights and source-adjudicated replay failures under the disclosed detection correction. Seven craft scores plus fault fraction and runnable evidence use C-004 weights.
- Potency: reject malformed submissions, missing/native-mismatched grades, out-of-range scores and citation errors; no automatic repair call.
- Blind spot: one trial, tool-free writing, overlapping coverage/fault evidence, reviewer subjectivity.
- Loop: missing bounded author/review coordinator under the private round directory.
- State: Objectively Green for the disclosed amended protocol. Eight exact native files, two validated blind reviews and independent arithmetic are complete. All suites pass both healthy controls and detect 6/6 faults. Review of all 48 fault runs credits the two lost-work failures that the original error-class filter excluded. Mean combined score rises from 82.60 to 91.56875 (+8.96875). Five original files exceed the 24 KiB instruction and were evaluated under the uniform 64 KiB analysis amendment, without regeneration. Receipts: `prepared-round/codex-only/{review-summary,objective-adjudication,detection-correction}.json`; selected provenance records ten completed model sessions and 677,731 reported tokens. This is not strict original-limit success or a population claim.
- Stop: native infrastructure or review validation failure; preserve attempt and report unresolved without rerolling.
- Repair receipt: `prepared-round/checks/preflight.json`, `checks/author-contract.tap`, and `checks/selected-account.json`; six author-contract checks, two account checks, syntax checks, and sandboxed account authentication pass. Corrected schema has no code-string length constraint; source bytes remain exact under a posthoc 24 KiB guard. Paired prompts are 17,431 / 54,512 bytes, differing only by the frozen three-file skill. Explicit account routing applies to both Opus authors and the Opus reviewer; global login is unchanged. Staged first execution permits attributable behavioral failures and stops provider/structural/operational failures. Plan SHA-256: `d4525c7ee39597e0ce68c46d73113f1f5a0d25a5ab2fd4092a7b64066a745f77`. Its first provider request was rejected before generation; subsequent selected native outputs and exact-source replay are now verified.

### TESTAUTHOR__M1__G3 — Live reader journey

- Claim: Engineering includes all five bucket benchmarks and all 53 scored settings; Overall includes all 56. Both conditions use each model’s same completed task pairs, missing results are omitted, and coverage appears on every main-table row. Engineering averages available pairs equally; Overall normalizes 50/25/25 over each model’s measured categories. Individual benchmark scores, authored JS, reviewer evidence and analysis-policy disclosures remain unchanged.
- Lie: source viewer is rewritten, scores differ from receipts, stale assets or accidental old-data changes.
- Setup: G2 receipts and pinned selection; dedicated projection through existing table/viewer/publisher.
- Action: independent five-task Engineering and nine-task Overall arithmetic; completeness, identity and serialization guards; browser score/breakdown/source/coverage checks; original task-data equality; canonical publication and live byte checks.
- Observation/verdict: 53 Engineering and 56 Overall settings visible in the main rankings by default, exact available-pair scores, visible coverage on every row, unchanged complete-setting totals, selected-model breakdowns and source links, inspectable original tests/reviews and unchanged individual benchmark evidence.
- Authority/basis: current candidate and live published asset hashes.
- Potency: source/score pin mismatch rejected; browser checks compare projected evidence and actual opened files.
- Blind spot: technical fidelity does not accept subjective design or judge taste.
- Loop: reuse canonical publisher; extend existing browser checks for new route.
- State: Objectively Green. Live release `109bce7524cec1d663d35417ce872959279f32ef4f3e8244e37b6cf242f75cdc`; receipt `prepared-round/publication/available-coverage/live/audit.json`. All 53 Engineering and 56 Overall settings appear in the main tables by default. Independent reconstruction verifies all 109 setting scores, identical task masks across conditions and actual category/task weights. Sol scores 68.0125 → 91.725 from 2/5 Engineering tasks and 2/9 Overall tasks, visibly marked partial. Every formerly complete aggregate total and all 110 source/native/response/selection pins remain unchanged.
- Supporting receipt: Twelve focused arithmetic/source/serialization tests, ten affected frontend checks, 31 site-lock tests, 36 candidate browser checks, 24 live browser checks and 19 public byte checks pass. Root reviewed desktop/mobile model rows, Sol’s exact two-task breakdown, missing rows and actual Overall category contributions. Native navigation preserves model selection; resource plots exclude missing measurements. Three requested-account assertions pass; owned verification processes have stopped.
- Size decision: Restoring the full scored model cohorts increases the compressed landing from 312,913 to 335,395 bytes after removing duplicate serialized metadata, scores and entry references. The landing budget is now 344,000 bytes, with 8,605 bytes headroom; other caps and all score/source/browser checks remain intact. Full runtime roundtrip equality proves that compaction changes no exposed data.

- Stop: failed equality, source or live check; repair publication without changing native results.
- Existing unrelated guard: `test/benchmark-top-model.test.js` expects a Core Idea Writing baseline of 83.0833333333, while the accepted release `237f84` and current unchanged Writing data both return 83.4545454545 on the selected 11-story basis. The independent reviewer reproduced this against immutable release assets with matching manifest hashes; this correction does not change Writing data or that expectation.

## Missing harness envelope

| Need | Why existing is insufficient | Envelope / owner | Retirement |
| --- | --- | --- | --- |
| Redis authoring case and calibration | Existing case rewrites player saves and starts DynamoDB | `benchmarks/test-authoring/`, private round fixture, minimal optional-service change to existing fixture/replay; case agent | Retain as reusable benchmark case |
| Bounded author/review coordinator | Existing coordinator assumes rewritten suites and preserved protection | Private round scripts, frozen packets and rubric; native agent and root | Keep only regeneration and provenance artifacts |
| Separate publication projection | Existing parser assumes improvement baselines/preservation | New projector/selection and shared UI integration; publication agent | Permanent separate benchmark |

## Run policy and retention

Local calibration precedes eight author requests and two batched reviews. The user resumed Opus before review; preserve completed work and add only its two authors and reviewer. Stage the first author, then max four concurrent. Preserve task, source, skill and all nine scoring weights. The total averages the two reviews for 70 craft points and adds 30 objective points. Author instructions and original strict outcomes retain the 24 KiB source limit. A separately pinned amendment evaluates all original files under 64 KiB, chosen after generation exposed three slight overruns and before their replay or any review. Disclose this protocol deviation; do not claim strict frozen-protocol success. No code-string `maxLength`; prompt bounds remain 64 KiB author / 256 KiB reviewer, with ten-minute native timeouts. Record actual usage and retain immutable evidence. Publish authored tests and method, never credentials or private backend implementation. Model ratings do not establish human taste acceptance.
