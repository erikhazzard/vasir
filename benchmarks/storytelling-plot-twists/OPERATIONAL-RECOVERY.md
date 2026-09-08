# Verified Codex capacity continuation

`continue-codex.mjs` resumes the existing completion directory after a separate,
recent same-account capacity check. It calls the unchanged, frozen directory
runner and preserves the original prompts, models, efforts, reviews, runtime
pins, failed attempts, and private streams. It does not publish anything.

The capacity file is a sanitized `account/read` and `account/rateLimits/read`
receipt with `kind: sanitized-read-only-capacity-receipt`. Its explicit
authentication context must match the current `CODEX_HOME`, its capacity check
must be no more than one hour old, and it must show available subscription
capacity with no available credits or spend-control stop. The receipt is
retained by absolute path and SHA-256 in the continuation record.

```sh
node benchmarks/storytelling-plot-twists/continue-codex.mjs --dispatch --run-id storytelling-plot-twists-v1-completion-2026-09-08 --capacity-proof CURRENT_CAPACITY_RECEIPT.json --mode judging --concurrency 16
node benchmarks/storytelling-plot-twists/continue-codex.mjs --dispatch --run-id storytelling-plot-twists-v1-completion-2026-09-08 --capacity-proof CURRENT_CAPACITY_RECEIPT.json --mode generation --concurrency 16 --max-rows 60
```

Before calling the provider, the controller retains an immutable operational
record containing every selected row and every exact historical quota stream
being acknowledged, plus the complete pre-invocation `run.json` bytes and exact
operational controller source copies. The first two-request judging pass pins
the pre-existing immutable publication archive whose SHA-256 exactly matches
its initial-run hash. Retry selection must consist solely of untouched Codex
slots or empty-output Codex quota failures predating the capacity check. Any
other selected error is rejected. Policy refusals never enter this selection;
Claude remains paused. The unchanged full judge panel must consist of Codex
judges.

Any newly observed Codex quota stream, including a new failure for an old row,
stops dispatch. Authentication failure or evidence-integrity errors also stop
dispatch. Following successful initial judging, the coordinator allocated eight
concurrent requests, then sixteen for later stages after stable checkpoints.
Each older invocation retains its actual two/eight concurrency and exact source
bytes; the new ceiling never alters an active invocation. Active requests drain and
checkpoint. Signals request the
same graceful pause. The existing exclusive lock and frozen lineage validator
remain in force. No account, provider, model, effort, panel, purchase, or credit
fallback is available.

After all original Codex slots are generated and fully judged, the local-only
`checkpoint-codex.mjs --run-id ID --retain` audit validates frozen sources,
retained stream hashes, original valid answers/reviews, and attempt prefixes.
Full panel coverage and exact arm scores come from `projectWritingRun`, not
the rounded harness configuration summaries. It refuses an active or unfinished
Codex run and preserves exact run, skill,
manifest, audit-script and audit bytes in a new hash-named, read-only operational
checkpoint. It does not select a publication source or make provider calls.
