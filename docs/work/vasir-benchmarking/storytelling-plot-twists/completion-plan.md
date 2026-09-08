# Plot twists: 33-setting completion plan

Status: implementation and offline verification, 2026-09-08. No contestant, judge, or live probe has been dispatched by this workstream. Provider concurrency and dispatch budget remain with the coordinating agent. The implemented completion driver and operational instructions are in `benchmarks/storytelling-plot-twists/COMPLETION.md`; final manifest preparation waits for the coordinating agent's runtime probe acceptance and source freeze.

## Frozen sources and remaining work

The current four-setting run is `.agents/vasir-evals/storytelling-plot-twists/storytelling-plot-twists-v1-2026-09-07/run.json`, SHA-256 `97d1172df61311ca493c53ef99d193d607652de9bc0827bba2d3d6ca3fb41399`. Its public selector pins an identical immutable snapshot. It has 80 returned answers, 78 protocol-valid answers, 38 complete paired trials, and 152 original answer assessments in 76 judge requests.

The Core idea / Magic inventory contains 33 configurations: 23 Codex configurations and 10 Claude configurations. The existing Plot twists inventory supplies Astra ultra, Sol ultra, Terra ultra, and Luna max. The other 29 settings have no Plot twists generations.

| Work | New generation calls | New pair-level judge calls | New answer assessments |
| --- | ---: | ---: | ---: |
| 19 missing Codex settings × 10 trials × 2 conditions | 380 | 380 | 760 |
| 10 missing Claude settings × 10 trials × 2 conditions | 200 | 200 | 400 |
| Two failed treatment slots, retaining their valid baselines | 2 | 4 | 8 |
| Total | 582 | 584 | 1,168 |

The complete logical inventory would contain 660 valid answers, 330 paired trials, 660 judge requests, and 1,320 assessments. The two original invalid returned outlines remain additional retained attempts. None of the 78 valid existing answers or 152 valid existing assessments needs replacement.

The exact user prompt remains `Create a brief outline of a scifi story with one or more major plot twists`. Its generation hash is `0a79f99032b43921a0ea71aad79de92e20332fa23f86f499a03c83f5c375c41c`; the unchanged seven-dimension rubric and Astra xhigh / Sol xhigh panel have scoring hash `fb47f07285896977612441bcd24b18700c87a970f825045dcb165ad66f9dd944`. The complete frozen skill snapshot hash is `06a52744c28f5e7ec367edd5c07d0d0720071eeb835d128d2fa07f3d43b5e8ca`. The current local skill has that same hash, but execution must still load the pinned snapshot rather than depend on mutable files.

## Verified causes and limits

Both excluded treatment answers contain substantive outlines. Astra ultra trial 9 lacks verified twists-reference chunk 13; Terra ultra trial 3 lacks chunk 2. Each receipt verifies the root's two chunks and 13 of 14 reference chunks. All recorded helper commands have completed status, including the attempted missing chunk reads. Only the stream digest and reduced tool-call records are retained; the evidence does not identify the exact reason a complete frame was absent. Truncation is a plausible transport failure, not an established retrospective diagnosis. Neither old answer may be relabeled valid.

The current runner excludes `EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE` from retries even with `--retry-failed`. Its resume validator freezes the model inventory and row identities. Its prepare path and runtime reject mandatory verified reads for Claude; Claude contestants currently receive only the Read tool, while the verifier recognizes Codex command-execution frames. The publication validator also enforces the old four-setting preregistration. There is no supported append operation that can extend this old manifest to 33 settings while retaining its original identity.

## Proposed implementation boundary

Create a separately declared completion edition and append-only execution record under `docs/work/vasir-benchmarking/storytelling-plot-twists/completion/`, with new private artifacts in a new run directory. Do not edit the original run, manifest, skill snapshot, publication pointer, benchmark definition, or saved exclusions.

The completion manifest should pin the parent run/snapshot/definition hashes, the full 33-setting inventory, ten logical trials in each condition, unchanged generation/scoring hashes, and an explicit slot plan. Its initial state imports each valid original row and completed original judge batch by exact hash. It references the two failed rows as immutable predecessor attempts. Only those two invalid treatment slots and the 580 absent slots are eligible for generation. A completed valid output is never eligible for replacement based on its quality.

Use an isolated adapter for required-read delivery and receipts unless ownership of shared runtime files is explicitly coordinated. The adapter must preserve every byte of the original skill/root/reference, keep the exact user prompt, and stage fresh isolated contexts for each condition. It must distinguish its new transport version from original receipts. Proposed transport improvement: bounded read chunks substantially below the current 8,000-byte frame size, preserved full successful tool outputs, and strict complete-byte validation before accepting an answer. Claude needs a provider-native Read receipt path with tool-use/result identity linkage and verified complete chunk bytes, without granting extra tools to one condition. Smaller chunks and cross-provider receipt parsing require offline truncation/error fixtures and separate synthetic non-story transport probes before scored use. They must never retroactively validate an old failed receipt.

Original and new cohorts need distinct provenance even though their prompt, rubric, skill bytes, trials, and judging panel are identical. A future publication merger must validate the new manifest and each inherited row/batch, retain the failed-attempt archive, and derive all totals from the original assessments. It must disclose that the expanded inventory and recovery policy were declared after the original four-setting run, rather than present the expansion as part of the original preregistration.

Expected new files are a completion manifest/preparation helper, isolated transport adapter, append-only completion runner, and focused offline fixtures/tests. A narrowly scoped publication adapter may later be needed; it is not authorized to select a source or deploy merely because completion execution finishes.

## Dispatch coordination

The first dispatch gate is shared runtime ownership, followed by synthetic transport proof and explicit provider/concurrency allocation from the coordinating agent. New contestants receive only the frozen exact task and their assigned treatment instructions/files; judges receive only the frozen rubric and blinded original response pairs. This plan, UI discussions, comparative scores, and failed-answer commentary must never enter contestant or judge contexts.

For budget context only, the original 80 generation attempts recorded 22,481,661 input tokens, of which 19,985,792 were cached, and 340,206 output tokens. The original 76 judge requests recorded 1,060,016 input tokens and 161,219 output tokens. Those were predominantly ultra generators and do not provide a reliable extrapolation for the expanded effort/provider mix. No dollar-cost claim is made.
