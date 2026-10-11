# EVAL PLAN — Test authoring

**Human Read:** The user resumed Opus before review. All eight authors and both reviews are complete and published. Four paired results show a mean +6.8854-point gain. The expanded source analysis limit is disclosed and all scoring weights remain unchanged.

## Proof capsule

- Updated: 2026-10-10. Owner: root.
- Work spec: [work-spec.md](work-spec.md).
- Warrant: fixture calibration, paid native sessions, independent ratings and live publication need shared frozen inputs and durable receipts.
- Next action: User review; no model calls remain. Opus author and reviewer receipts verify the requested account.
- Claim boundary: one service-boundary task, one attempt per model/condition; no browser E2E, general ranking, or human taste acceptance.

## Material risks and proof stack

| Risk | Sufficient evidence |
| --- | --- |
| Tautological tests receive fault credit; startup failures look like detection | Healthy/reference and negative controls; only assertion failures from cases passing both healthy runs count |
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
- Stop: invalid fault, flaky healthy reference, leakage or non-assertion detection; repair instrument before native generation.

### TESTAUTHOR__M1__G2 — Faithful paired comparison

- Claim: eight native authored files and two blind reviews yield scores under unchanged weights, without source repair or outcome selection.
- Lie: hidden retries, changed task, copied existing tests, invented grades, stale skill snapshot or unresolved infrastructure scored as model failure.
- Setup: G1 qualified; frozen task, source, three-file skill snapshot, rubric, model IDs and bounds; one exact new `.spec.js` per response.
- Action: complete the author inventory without rerunning completed requests; reuse qualified replays, execute remaining files, then blind both reviewers, validate line evidence and independently recompute.
- Observation/verdict: exact receipts and usage for every attempt; treatment is the only paired prompt difference; source and reviewer bytes unmodified; ratings complete or visibly unresolved; declared arithmetic reproduced.
- Authority/basis: native receipts, frozen protocol and replay assertions. Seven craft scores plus fault fraction and runnable evidence use C-004 weights.
- Potency: reject malformed submissions, missing/native-mismatched grades, out-of-range scores and citation errors; no automatic repair call.
- Blind spot: one trial, tool-free writing, overlapping coverage/fault evidence, reviewer subjectivity.
- Loop: missing bounded author/review coordinator under the private round directory.
- State: Objectively Green for the disclosed amended protocol. Eight exact native files, two validated blind reviews and independent arithmetic are complete. All suites pass both healthy controls; six detect 6/6 faults, Sol Skill and Opus Skill detect 5/6. Mean combined score rises from 82.60 to 89.4854 (+6.8854). Five original files exceed the 24 KiB instruction and were evaluated under the uniform 64 KiB analysis amendment, without regeneration. Receipts: `prepared-round/codex-only/{review-summary,objective-adjudication,independent-score-audit}.json`; selected provenance records ten completed model sessions and 677,731 reported tokens. This is not strict original-limit success or a population claim.
- Stop: native infrastructure or review validation failure; preserve attempt and report unresolved without rerolling.
- Repair receipt: `prepared-round/checks/preflight.json`, `checks/author-contract.tap`, and `checks/selected-account.json`; six author-contract checks, two account checks, syntax checks, and sandboxed account authentication pass. Corrected schema has no code-string length constraint; source bytes remain exact under a posthoc 24 KiB guard. Paired prompts are 17,431 / 54,512 bytes, differing only by the frozen three-file skill. Explicit account routing applies to both Opus authors and the Opus reviewer; global login is unchanged. Staged first execution permits attributable behavioral failures and stops provider/structural/operational failures. Plan SHA-256: `d4525c7ee39597e0ce68c46d73113f1f5a0d25a5ab2fd4092a7b64066a745f77`. Its first provider request was rejected before generation; subsequent selected native outputs and exact-source replay are now verified.

### TESTAUTHOR__M1__G3 — Live reader journey

- Claim: the new standard table shows exact combined results and authored JS, with both reviewers and the analysis-policy deviation documented, while the incumbent comparison remains unchanged.
- Lie: source viewer is rewritten, scores differ from receipts, stale assets or accidental old-data changes.
- Setup: G2 receipts and pinned selection; dedicated projection through existing table/viewer/publisher.
- Action: targeted data validation, browser table/source checks, old-projection equality, canonical publication and live byte checks.
- Observation/verdict: four paired rows, exact combined scores, inspectable original tests/reviews, and the source-limit amendment disclosed, correct route and unchanged incumbent evidence.
- Authority/basis: current candidate and live published asset hashes.
- Potency: source/score pin mismatch rejected; browser checks compare projected evidence and actual opened files.
- Blind spot: technical fidelity does not accept subjective design or judge taste.
- Loop: reuse canonical publisher; extend existing browser checks for new route.
- State: Objectively Green. Live release `9641dd9fbb2f0b81eb2973a8d32c5629888ff47cfd62da463b39148b5664e98b`; receipt `prepared-round/publication/live/audit.json`. All 36 candidate checks, 24 live browser checks and 19 public byte checks pass; exact eight-file source and every incumbent benchmark are unchanged.
- Supporting receipt: Candidate desktop/tablet/mobile screenshots reviewed, canonical dry-run and publication completed, 30 site-lock tests passed. Mobile harness navigation now waits for the previous hash/scroll to settle; the original failed receipt is retained privately. No page behavior or native evidence was changed to satisfy the check.
- Stop: failed equality, source or live check; repair publication without changing native results.

## Missing harness envelope

| Need | Why existing is insufficient | Envelope / owner | Retirement |
| --- | --- | --- | --- |
| Redis authoring case and calibration | Existing case rewrites player saves and starts DynamoDB | `benchmarks/test-authoring/`, private round fixture, minimal optional-service change to existing fixture/replay; case agent | Retain as reusable benchmark case |
| Bounded author/review coordinator | Existing coordinator assumes rewritten suites and preserved protection | Private round scripts, frozen packets and rubric; native agent and root | Keep only regeneration and provenance artifacts |
| Separate publication projection | Existing parser assumes improvement baselines/preservation | New projector/selection and shared UI integration; publication agent | Permanent separate benchmark |

## Run policy and retention

Local calibration precedes eight author requests and two batched reviews. The user resumed Opus before review; preserve completed work and add only its two authors and reviewer. Stage the first author, then max four concurrent. Preserve task, source, skill and all nine scoring weights. The total averages the two reviews for 70 craft points and adds 30 objective points. Author instructions and original strict outcomes retain the 24 KiB source limit. A separately pinned amendment evaluates all original files under 64 KiB, chosen after generation exposed three slight overruns and before their replay or any review. Disclose this protocol deviation; do not claim strict frozen-protocol success. No code-string `maxLength`; prompt bounds remain 64 KiB author / 256 KiB reviewer, with ten-minute native timeouts. Record actual usage and retain immutable evidence. Publish authored tests and method, never credentials or private backend implementation. Model ratings do not establish human taste acceptance.
