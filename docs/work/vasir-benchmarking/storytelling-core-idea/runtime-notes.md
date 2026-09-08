# Storytelling runtime evidence

The storytelling run reuses the existing fresh CLI runtime, benchmark model registry, independent anonymous judge, row score basis, and history artifact format. It adds a frozen skill corpus, provider-instruction injection of its root, progressive reference access, and generation checkpoints before and after every attempted cell.

The full user question is identical in both conditions. Only the skill arm receives the skill root in a provider instruction and the frozen reference files in its temporary workspace. The root directs the agent to the appropriate references; the entire library is not pasted into every request. Codex uses its read-only shell and Claude exposes Read under safe mode. These provider tool interfaces differ and are recorded. The local CLIs retain responsibility for authentication; environment values and credentials are never serialized into receipts.

Use the dedicated command from the repository root:

```sh
node cli/eval/run-storytelling-benchmark.js --prepare --run-id YOUR_RUN_ID
node cli/eval/run-storytelling-benchmark.js --resume YOUR_RUN_ID --generation-only --generate-provider codex --concurrency 16
node cli/eval/run-storytelling-benchmark.js --resume YOUR_RUN_ID --judge-only --judge-provider codex
```

After Claude login is available, resume generation with `--generate-provider claude` and judging with `--judge-provider claude`. Omit execution filters to run both providers. The generic benchmark entrypoint explicitly rejects this benchmark before resolving or flattening the skill, because its neutral prompt and inline corpus would constitute a different experiment.

## Instruction delivery probe, 2026-09-07

Three harmless GPT-5.6 Luna / low sessions answered the same question about frozen water. A synthetic skill root required the exact sentinel `SKILL_SENTINEL_8271`.

| Invocation | Output |
| --- | --- |
| Developer override before `exec` | Ice. |
| Override before `exec`, without `--ignore-rules` | Ice. |
| Developer override after `exec` | SKILL_SENTINEL_8271 |

This established that isolated `codex exec` discarded the override placed before its subcommand. Runtime `progressive-frozen-skill-v2` places both the skill instruction and web policy after `exec`. The earlier v1 smoke is retained as invalid treatment plumbing evidence and is excluded from scored production.

A separate v2 probe placed `REFERENCE_SENTINEL_c4e8f301` only in a frozen reference file. Luna returned that exact string after one observed read of `references/probe.md`. This proves both instruction delivery and actual progressive file access. Session identifiers stay in local diagnostic evidence. These sentinel outputs are plumbing checks, not story interpretation scores.

## Identity and availability

The locally installed versions were Codex CLI 0.153.4 and Claude Code 2.1.263. The matrix uses exact GPT-6 Astra, GPT-5.6 Sol/Terra/Luna, Claude Fable 5.1, and Claude Opus 5 selectors. Codex ultra is recorded as a CLI runtime mode; it is not described as an ordinary public API reasoning level. Claude ultracode is excluded because it changes workflow and agent count.

Codex JSON currently exposes thread and usage receipts but no positive model/effort attribution. Its receipt therefore distinguishes the exact CLI request from provider-confirmed values. Claude requires positive output attribution to the exact canonical target. Synthetic error messages and model names in initialization events cannot establish successful model execution.

The initial default-context Claude smoke failed with expired OAuth and failed refresh. A later status-only check found no Claude, Anthropic, or OAuth environment variable names, and all three default-context variants (current environment, without environment auth, and default configuration without environment auth) reported `loggedIn: false`, `authMethod: none`. No credential value or token file was inspected. A subsequent bounded check of the existing Ratatosk-managed account contexts found one already-authenticated first-party Claude context. Selecting it through the supported `CLAUDE_CONFIG_DIR` mechanism required no login or credential changes. In a separate four-cell smoke, exact Opus 5 low succeeded in both conditions with positive provider output attribution; its skill answer read both the controlling-idea and antagonism/irony references. Exact Fable 5.1 low returned API 429 in both conditions. Those smoke answers remain excluded; authentication success is not a claim of quota or model availability for every target.

## Resume and missing cells

The full 33-configuration, 12-case, two-condition inventory contains 792 rows. `--generate-provider codex` schedules only the 552 Codex rows while preserving all 240 Claude rows as pending with zero attempts. Resume uses the frozen corpus and skill snapshot, checks hashes and exact messages, and reuses successful generation and judge batches. Failed attempts remain in the row history when explicitly retried.

The prepare declaration's generation concurrency was four. Production Codex generation was resumed with the execution-only override `--concurrency 16`; the initial declaration field is not a record of actual concurrency for every resumed invocation. Concurrent queue load affects latency, so observed times are operational measurements, not controlled provider-speed estimates.

Only intact matched pairs enter scoring. Their missing peers remain in the planned denominator and in the judgment eligibility record. A partial run remains incomplete; unavailable configurations do not prevent complete pairs from receiving scores. The native ten 1–10 dimensions receive equal weights and no gate caps. Independent panel means preserve half-point ratings; the normalized total is the mean rating multiplied by ten.

`--judge-provider codex` executes only that provider's seat while preserving the declared two-provider panel. Every other batch is marked `deferred` with `executionAttempted: false`, zero duration, and no score. Later `--judge-provider claude` reuses the completed Codex batches and fills the missing Claude seats. No aggregate score exists until both required independent reviews are complete.

The separate `probe-storytelling-judge.js` command saves a single-judge transport/schema check outside the production run and explicitly excludes it from the public panel. It cannot modify source responses or production scores.

## Pre-scoring audit corrections

Before any production judgment, the audit found that the shared prompt formatter still displayed legacy 0/2/4 anchor labels for this 1–10 rubric. The formatter now emits all declared 1/5/10 anchors for each of the ten dimensions and states that no gate caps apply. The earlier transport probe remains diagnostic evidence only; it does not establish that the old prompt faithfully presented the rubric. Legacy 0–4 benchmark prompts and their missing-midpoint fallback remain unchanged.

The audit also found that the first checkpoint of a resumed judge pass could omit compatible paid batches whose reuse jobs had not yet been visited. Checkpoints now start with every validated reusable batch before any new work is scheduled. An interruption regression begins with twelve completed Codex batches and a deferred Claude seat, interrupts the second provider pass after persistence, and confirms that all earlier receipts and evaluations survive and that no persisted complete batch is rerun.

## Execution-only model filtering

`--generate-model` matches the exact model string already present in the frozen matrix. It does not resolve aliases or change the declaration. If combined with `--generate-provider`, both filters must match; unknown models and empty provider/model intersections are rejected before any artifact change or agent call. The existing `--model` flag still declares a new run's matrix and is rejected on resume.

After the current writer exits, available Opus generation can proceed without attempting quota-blocked Fable cells:

```sh
CLAUDE_CONFIG_DIR="/absolute/path/to/existing/Claude/context" node cli/eval/run-storytelling-benchmark.js --resume YOUR_RUN_ID --generation-only --generate-provider claude --generate-model claude-opus-5 --concurrency 4
```

This schedules all pending Opus effort/condition/case cells while keeping every unselected Fable row pending with zero attempts and preserving the original denominators and required judge panel. The context path is a placeholder for an existing authenticated account, not an instruction to create or alter authentication.

New invocations append `executionHistory` records containing the launch mode, generation concurrency limit, provider/model filters, and selected generation row count. These operational receipts are separate from the frozen manifest and prepare-time declaration. They are not backfilled for earlier invocations, do not claim measured simultaneous utilization, and do not change prompt or scoring identities.

## Independent-panel execution concurrency

`--judge-concurrency` selects an execution-only independent-panel worker limit from 1 through 16; its default remains 8. Legacy synthesis jobs retain their existing limit of 4. The selected limit is recorded as `executionHistory[].judgeConcurrencyLimit` and is excluded from frozen inputs, panel declarations, prompt hashes, and score bases. Tests compare concurrency limits 1, 3, and 16 with the unchanged default and require identical prompts, scores, and score bases.

Once the current writer has exited and the default Claude context is authenticated and available, a combined generation-and-judging resume can use:

```sh
env -u CLAUDE_CONFIG_DIR node cli/eval/run-storytelling-benchmark.js --resume YOUR_RUN_ID --generate-provider claude --concurrency 16 --judge-concurrency 16
```

Omitting `--judge-provider` preserves execution of both declared panel seats. Valid retained batches are reused; neither an operational concurrency override nor a changed account context substitutes a model or creates a new judgment for a compatible completed batch.

## Execution-only judge quota circuit

The default Fable judging pass reached explicit API 429 usage-credit exhaustion
after 58 completed Fable batches. That already-running process had loaded the
earlier runner and continued attempting queued batches; the new guard does not
retroactively alter or interrupt that process. A separate managed-context probe
also reported the explicit Fable usage limit, not an authentication failure.

Future dedicated Storytelling judging invocations open an in-memory circuit only
after a recognized runtime exhaustion diagnostic for the exact requested
provider/model. The known diagnostics include exhausted usage credits, Fable's
explicit model usage limit, and Codex's explicit usage-limit message. Generic
429/rate-limit errors and output-filtering 400 errors do not qualify. An intact
error-result string can be decoded from the runtime's truncated private JSON
tail; a successful answer containing the same words is not quota evidence.

The first actual failure remains the original error. Calls already invoked are
allowed to settle and retain their success or failure. Later calls for that
provider/model are deferred without invocation, including another effort setting
for the same model; another model on that provider and other providers continue.
Deferrals retain no output, evaluations, usage, cost, or runtime receipt and have
`executionAttempted: false` and zero duration. Safe cause metadata binds the
failed request's prompt/schema, frozen run manifest, normalized error, and
available stream hash without repeating diagnostics, session IDs, or account
paths. It is retained in that invocation's execution history.

Each resume starts with a closed circuit, preserves all compatible completed
batch evidence, and retries only incomplete operational judge units. It does not
alter the frozen experiment, model declarations, prompts, score bases, or panel
arithmetic. Fixture regressions cover first-error/later-deferral behavior,
in-flight settling, provider/model scope, fresh-resume completion, unchanged
valid judgments and generation evidence, and non-quota failures.

Generic judge recovery replaces prior failed/deferred batch records rather than
maintaining their full attempt history. Before any such resume, wait for the
current writer to release its lock and use the archive-only
`prepareWritingPublicationSource()` procedure in the RUNBOOK to retain the exact
run and skill bytes under their SHA-256 pins. Record that archive in recovery
notes and final-source lineage. Safe circuit-cause hashes do not replace this
full diagnostic evidence, and archiving alone does not select or publish it.

## Provider output-policy blocks

The restored production Claude phase returned explicit API 400 output-filtering
errors for some calls, with no final answer. These are preserved terminal
failures, not transport/quota retries: no prompt change, model substitution,
rerouting or attempt to bypass the provider filter is made. The failed slot
remains in the declared inventory. Its successful counterpart remains readable
but unscored because this edition judges intact matched pairs only. Any
configuration lacking a complete same-case pair is excluded from the whole-corpus
rankings; the available evidence from its other cases remains inspectable.

The failure adapter retains a bounded private diagnostic stream tail, including
the provider error result, in the failed attempt. Complete raw streams are not
retained. Public failure labels are derived from those recorded errors and never
include the raw diagnostic text, session identifiers or account information.
