# Bounded original Core review continuation

`continue-core-claude.mjs` is a separate operational controller, not a frozen
benchmark revision. It invokes the unchanged `runStorytellingBenchmark` and
`judgeBenchmarkRows` through their existing injection points. No row filter,
prompt, schema, model, panel, trial, generation answer, or scoring rule changes.

The immutable drained anchor is
`bdf31f6ba88a720057da05d31597dd80a35606201dff7c73a6a741a4cefe4280`;
the original published anchor is
`0b47f5bfa55fdce4c3fba9044bac1270ec57df9ee1ae85030a9970c8cfb156ac`.
Each anchor is the directory name beneath
`.agents/vasir-evals/storytelling-core-idea/publication-snapshots/` and the
SHA-256 of its exact `run.json` bytes.

At the drained anchor, Astra has 394 successful reviews and Fable has 295.
The 99 remaining Fable slots are 96 recoverable original reviews (93 never
dispatched, three retained quota failures) and three terminal content-policy
blocks: batches 242, 257, and 283. Those three error records remain exact.
Later explicit structured refusal events count as terminal only when the
controller verifies the retained raw stream's path, byte count, and SHA-256;
the source error record is preserved, not relabeled or retried.

The controller first derives exact missing requests with a provider-free pass
through the frozen judge. The actual pass calls only the first authorized
eligible slots in original order, at most 20 calls and four concurrently.
Every actual checkpoint preserves all completed, terminal, and undispatched
batch records before the original writer runs. The loader's optional
`undefined` properties are compared by persisted JSON semantics. A swallowed
top-level adapter error cannot be mistaken for a successful invocation.

Each invocation retains exact prestate bytes, authorization and capacity
proofs, controller/dependency source bytes, request hashes, each new batch
record, complete stdout/stderr files and their hashes, and a final audit under
the run's `operational-core-recoveries/<invocation-id>/` directory. Previous
failed attempts remain independently available in those exact prestates.
Successful and failed provider responses retain the frozen runtime receipts.
New quota/authentication failures stop new calls while in-flight work drains;
SIGINT/SIGTERM request the same graceful pause without terminating providers.

Capacity must be a recent archive-bound successful original Fable call with
actual allowed/non-overage metadata, validated by
`cli/eval/writing-capacity-evidence.js`. It is not a fabricated `/usage` reading.
Default account context and disabled usage-credit consumption are required.
An invocation also requires explicit root authorization with the same target
and allocation. Do not dispatch without a current authorization/proof.

Prepared invocation (not executed by the implementing agent):

```sh
node docs/work/vasir-benchmarking/writing-completion-20260908/continue-core-claude.mjs --dispatch --authorization docs/work/vasir-benchmarking/writing-completion-20260908/claude-core-retry-authorization-20260909T0037Z.json --capacity-proof docs/work/vasir-benchmarking/writing-completion-20260908/claude-core-capacity-20260909T0045Z.json --max-calls 20 --concurrency 4
```

Tests include zero-provider planning, budget/concurrency, graceful quota/auth
stops, protected records, exact raw capture, immutable real inventory, modern
refusals, and two actual frozen-runner integrations in isolated temporary
copies: paused with no provider call, and one explicitly mocked review. No
model calls, live-run writes, or publication changes occur during these tests.

The parent independently ran the prepared tests, but did not launch Core.
A later actual Claude HTTP 429 session-quota response at 2026-09-09 01:00:07
UTC supersedes the earlier archived-success capacity proof. Core dispatch is
therefore held until a new verified capacity change and authorization. The
controller also retains failures from its own planning, request, and audit
checks instead of allowing the frozen judge's per-batch catch to hide them;
it stops new work and drains active calls before reporting such a failure.
