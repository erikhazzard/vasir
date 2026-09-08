# Plot twists completion edition

This is a new, post-original-run cohort declaration, not a rewrite of the original four-setting preregistration. The prompt, frozen skill bytes, seven rubric dimensions, judge panel, ten trials, condition hashes, generation hash, and scoring hash remain unchanged. The operational read instructions change explicitly: new Codex creators use a local read-only integer-indexed MCP chunk tool; new Claude creators use restricted Read-tool frames. Both arms use their provider's same isolation and tooling. The plain Codex tool exposes the same definition but contains no skill chunks. Original creators retain the original runtime and instructions.

Synthetic transport investigation rejected smaller command frames: some successful Codex command events had entirely empty saved output, so completion status alone could not verify reads. The accepted MCP direction verifies the entire framed tool result, not a command claim. It adds no path-taking, shell, network, or environment API to the chunk tool. Only separate successful live transport probes can approve this runtime for scored dispatch.

The completion imports the original 78 valid answers and 76 completed two-answer judge requests unchanged. It retains the two original failed-read answers as immutable predecessors. It needs two operational replacement generations and 580 new generations across the missing 29 settings: 582 new creator calls and 584 new matched-pair judge calls if all complete successfully. The full cohort is 33 settings × 10 trials × 2 conditions, with two independent judgments per answer.

New creator receipts must declare `writing-frozen-workspace-only-v1`: host skill discovery, project instructions, and external resources disabled, with file access limited to the fresh workspace. Both arms receive the same provider restrictions. The validator checks this isolation receipt, exact transport runtime and required-read policy separately; a short-file receipt cannot be relabeled as another transport. Inherited rows remain untouched, with their original isolation evidence.

Implementation: `cli/eval/plot-twists-completion.js`; CLI: `complete.mjs`; local-source tests: `test/plot-twists-completion.test.js`. The original run, manifest, benchmark definition, publication selector, and frozen snapshot are never edited.

## Dispatch gates

Do not prepare the final manifest until the coordinating agent freezes the runtime sources and accepts separate synthetic transport/boundary probes. Do not dispatch until that agent allocates provider concurrency and approves execution. The planned starting allocation is four paid CLI requests for this workstream, not four per provider or mode. Run one command at a time against a completion directory; its exclusive lock rejects concurrent writers.

Preparation makes no provider requests and freezes the runtime/runner source hashes plus copies of those files. Resume refuses source drift. The source validator retains the exact original run text under its pinned SHA-256, all valid inherited generator evidence and scores, every original completed judge batch, and the two failed predecessors.

```sh
node benchmarks/storytelling-plot-twists/complete.mjs --prepare --run-id APPROVED_NEW_ID
node benchmarks/storytelling-plot-twists/complete.mjs --status --run-id APPROVED_NEW_ID
```

After approval, complete the original Astra/Terra invalid slots first and judge the newly completed pairs. The valid baseline counterpart is reused, not regenerated:

```sh
node benchmarks/storytelling-plot-twists/complete.mjs --resume --dispatch --run-id APPROVED_NEW_ID --mode generation --stage cleanup --concurrency 2
node benchmarks/storytelling-plot-twists/complete.mjs --resume --dispatch --run-id APPROVED_NEW_ID --mode judging --concurrency 4
```

Then proceed in coordinator-approved provider stages. `--max-rows N` bounds new generation calls, but is deliberately rejected in judge mode. The judge runner reuses all completed reviews, including exact inherited objects; only missing pair reviews dispatch. Its ephemeral batch-position numbers can change when the cohort grows; saved original batches are restored byte-for-byte, and new batches have stable prompt-hash IDs.

```sh
node benchmarks/storytelling-plot-twists/complete.mjs --resume --dispatch --run-id APPROVED_NEW_ID --mode generation --stage codex --concurrency 4
node benchmarks/storytelling-plot-twists/complete.mjs --resume --dispatch --run-id APPROVED_NEW_ID --mode judging --concurrency 4
node benchmarks/storytelling-plot-twists/complete.mjs --resume --dispatch --run-id APPROVED_NEW_ID --mode generation --stage claude --concurrency 4
node benchmarks/storytelling-plot-twists/complete.mjs --resume --dispatch --run-id APPROVED_NEW_ID --mode judging --concurrency 4
```

`--resume` without `--dispatch` is read-only status. `SIGINT` and `SIGTERM` request a graceful pause: no new requests dispatch; current requests finish and are checkpointed. Explicit quota exhaustion or authentication failure opens a provider/model circuit without substituting accounts, providers, models, or effort levels. Output-policy blocks are terminal. `--retry-failed` only admits empty-output operational errors, never valid/nonempty answers, incomplete mandatory reads, output-policy blocks, quota exhaustion, or authentication failures.

Every creator dispatch is checkpointed before calling a provider; every completed attempt is linked to its predecessor by hash. An abrupt kill can leave an unresolved dispatch. Such a slot is withheld from automatic resume even if its logical row is still pending. Inspect the retained private streams and call record before any further decision; the driver has no automatic “assume no answer” recovery. An abandoned lock also needs operator inspection rather than automatic deletion.

## Evidence and publication

New calls retain exact raw stdout/stderr privately in `provider-streams/<call-id>/`, captured before Claude's result adapter. A call record is written before spawn; stream receipts contain byte counts and SHA-256 hashes. Generator receipts and full judge-attempt records link those streams. Resume verifies retained stream bytes. Old calls had no full raw streams; their existing receipts are preserved without inventing missing evidence.

The Twists-specific publication extension validates the entire completion lineage before projection. It includes the separate frozen provider instruction sources, per-answer inherited/recovery/new origin, transport identity, and an explicit two-answer `supersededResponses` archive. Those failed predecessors remain unscored and never add trials to the denominator. New real scores are derived only from original judge dimensions. Completed setting totals still require all ten paired trials.

This driver does not change a publication selector, build/deploy the website, or replace an original report. Publication requires a separately approved, validated immutable snapshot after execution.
