# Claude generation after separately verified capacity

This is a separate operational continuation. It never authorizes judging or
changes the frozen runtime, prompts, panel, skills, accounts, or efforts.
Claude dispatch remains paused until the coordinator confirms current capacity.
A reset label alone does not permit dispatch.

The recent sanitized `/usage` receipt must record the unchanged default Claude
context, session and both weekly usage percentages below 100, and
`usageCreditsEnabled: false` from the observed “Usage credits are off” UI label.
`resetCreditConsumptionAllowed: false` records the continuation policy, rather
than a provider observation. No `CLAUDE_CONFIG_DIR`, `ANTHROPIC_API_KEY`, or
`CLAUDE_CODE_OAUTH_TOKEN` override may be present. The current exhausted-session
receipt cannot pass these checks.

`continue-claude.mjs --mode pending` uses the unchanged frozen directory runner
with `stage: claude` and `retryFailed: false`. All 192 initial untouched slots
retain the original planner order. Supply `--max-rows 60` for interleaved passes
and a concurrency allocation confirmed by the coordinator (controller ceiling sixteen).

`--mode quota-recovery --concurrency 1` invokes a separately versioned controller
for only Fable high, trial 3, treatment. Its original quota stream must match
`d220eef1a1175d835f860e55934d633ec31c0ba59de78798ea16dbd8caad984c`
exactly. A temporary planning-only view derives that row's exact frozen plan;
the actual error and its prior generation hash stay unchanged until a normal
dispatch/attempt pair is appended. The frozen generation helper and retained
provider runner receive the same configuration, prompt, skill, required files,
and Read transport. This controller cannot retry either Opus xhigh policy refusal
or any nonempty returned answer. A new failure stream is not the approved old
failure.

Both modes require explicit `--dispatch --run-id ID --capacity-proof FILE`.
They retain exact pre-invocation run bytes, controller source copies, capacity
proof hashes, all old failure evidence, and an honest execution-controller
identity. Shared session/account quota, authentication, or evidence-integrity
failure stops provider dispatch. Explicit model-only limits retain the frozen
runner's model-specific circuit: another registered model may still run its own
slots, without replacing any failed row's model. Signals drain active calls.
The existing exclusive completion lock remains in
force. Codex judging continues separately through `continue-codex.mjs` using its
own current capacity receipt and the unchanged full judge panel.
