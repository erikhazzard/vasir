# Vasir CLI Reference

Use this page when you need facts about commands, flags, JSON output, filesystem layout, or the supported CLI override surface.

## Install

Until Vasir is published on npm, install it directly from GitHub and pin the exact release you want:

```bash
npm install -g git+https://github.com/erikhazzard/vasir.git#<tag-or-sha>
```

Verify the installed binary:

```bash
vasir --version
```

## Commands

| Command | Syntax | What it does |
| --- | --- | --- |
| `status` | `vasir status [--json] [--repo-root <path>]` | Inspect global and repo-local Vasir state without mutating files; plain `vasir` defaults here |
| `context` | `vasir context [--json] [--debug] [--repo-root <path>]` | Emit a purely local repo handshake for LLMs: repo facts, relevant `AGENTS.md` files, recommended skills, and next commands |
| `doctor` | `vasir doctor [--json] [--repo-root <path>]` | Diagnose drift, alias problems, adoption needs, and blocked skill updates |
| `repair` | `vasir repair [--json] [--repo-root <path>]` | Repair repo-local Vasir metadata, aliases, and missing tracked skills without auto-upgrading current skill content |
| `diff` | `vasir diff [skill...] [--json] [--exit-code] [--repo-root <path>]` | Review the exact tracked repo-local skill files that would change before `vasir update` |
| `init` | `vasir init [--json] [--repo-root <path>]` | Sync the installed bundled catalog into `~/.agents/vasir`; inside a repo, also install and track the full catalog there |
| `update` | `vasir update [--json] [--dry-run] [--repo-root <path>]` | Sync `~/.agents/vasir`; then refresh whatever that repo is tracking: the full catalog or a selected installed subset |
| `list` | `vasir list [--json]` | Read the global catalog and list available skills |
| `add` | `vasir add <skill> [skill...] [--json] [--replace] [--agents-profile <name>] [--repo-root <path>]` | Copy skills into the current repo root at `.agents/skills`, with optional one-command AGENTS/CLAUDE scaffolding; use `vasir add all` for the full catalog |
| `adopt` | `vasir adopt [--json] [--repo-root <path>]` | Snapshot an existing `.agents/skills` tree into Vasir-managed state without copying or overwriting files |
| `remove` | `vasir remove <skill> [skill...] [--json] [--repo-root <path>]` | Remove project-local skills from the current repo root |
| `agents sync` | `vasir agents sync [--scope <path>] [--profile <backend\|frontend\|ios\|generic>] [--json] [--dry-run] [--repo-root <path>]` | Reconcile root or nested root `AGENTS.md` and `CLAUDE.md` from the canonical templates, local context, and `AGENTS__non-obvious.md` |
| `agents init` | `vasir agents init <backend\|frontend\|ios\|generic> [--json] [--replace] [--repo-root <path>]` | Write canonical `AGENTS.md` and `CLAUDE.md` starters in the current repo root |
| `agents draft-purpose` | `vasir agents draft-purpose [--json] [--write] [--model <name>] [--repo-root <path>]` | Draft a repo-specific `Purpose` paragraph for the current repo root `AGENTS.md` |
| `agents draft-routing` | `vasir agents draft-routing [--json] [--write] [--repo-root <path>]` | Draft repo-aware Section 1 routing lanes for the current repo root `AGENTS.md` |
| `agents validate` | `vasir agents validate [--scope <path>] [--json] [--repo-root <path>]` | Exit nonzero and identify any root or nested root `AGENTS.md` that still contains scaffold placeholders or broken repo routes |
| `benchmark publish` | `vasir benchmark publish [--dry-run] [--full-audit] [--json] [--repo-root <path>]` | Publish changed VasirBench files; optionally audit every asset and browser route |
| `eval run` | `vasir eval run <benchmark> --treatment skill:<name> [--model <name>] [--reasoning <effort>] [--trials <count>] [--open] [--repo-root <path>]` | Run an independent benchmark through matched clean and skill-treated fresh agents |
| `eval report` | `vasir eval report <benchmark> [run-id] [--open] [--repo-root <path>]` | Regenerate a self-contained visual report from a saved benchmark run |
| `eval run` (legacy) | `vasir eval run <skill> [--json] [--model <name>] [--trials <count>] [--repo-root <path>]` | Run the built-in baseline vs treatment suite owned by a skill |
| `eval inspect` | `vasir eval inspect <skill> [run-id] [--json] [--repo-root <path>]` | Inspect the latest or named saved eval artifact for a skill |
| `eval rescore` | `vasir eval rescore <benchmark-or-skill> [run-id] [--json] [--repo-root <path>]` | Recompute saved evidence with the target's current scorer or judge panel |
| `--version` | `vasir --version [--json]` | Print the installed CLI name and version |

### `status`

- Purpose: inspect-first, zero-risk visibility into what Vasir would do next.
- Result:
  - reports whether the global catalog is current, missing, outdated, or unhealthy
  - reports whether the current repo is tracked, needs adoption, needs repair, or is not initialized
  - reports tracked vs unmanaged local skills and the next safe action
  - reports the repo config path when the repo is already tracked
- Notes:
  - Plain `vasir` defaults to `vasir status`.
  - `status` never copies, deletes, or repairs files.
  - Extra local skill directories remain visible in `unmanagedSkills`. In a repo with a valid tracking policy they are informational and do not, by themselves, require adoption or make `overallStatus` attention.
  - Pass `--repo-root <path>` when you want to inspect an explicit subproject root.

Examples:

```bash
vasir
vasir status
vasir status --json
vasir status --repo-root packages/web
```

### `context`

- Purpose: give humans and LLMs one local-only command that explains how to operate in the current repo.
- Result:
  - returns repo facts already on disk: repo root, package summary, top-level entries, and README excerpt
  - returns the relevant root, nested root, and routed folder `AGENTS.md` files
  - returns the repo's tracked skills, installed skills, explained recommended skills to load first, and the next safe Vasir commands
  - returns an explicit execution contract saying the command is local-only and does not use a model, token, or network
- Notes:
  - `context` is read-only.
  - `context` reads the bundled catalog or a local override source directly; it does not need the global cache under `~/.agents/vasir`.
  - `context` is the intended LLM handshake command.
  - `recommendedSkills[]` are structured objects with `skillName`, `score`, `reasons[]`, and `matchedSignals[]`.
  - `recommendedSkillNames[]` is a convenience mirror of the selected recommendation list.
  - `--debug` adds timing detail, routed path hints, profile inference evidence, and the top candidate recommendation set.
  - Pass `--repo-root <path>` when you want to inspect an explicit subproject root.

Examples:

```bash
vasir context
vasir context --json
vasir context --json --debug
vasir context --repo-root packages/web
```

### `doctor`

- Purpose: diagnose repo drift and operator-facing repair needs.
- Result:
  - checks the global cache state
  - checks global and project alias health
  - checks whether the repo needs adoption or install-state repair
  - checks whether tracked skills are blocked from safe replacement
- Notes:
  - `doctor` is read-only.
  - Use it when `status` says a repo needs attention or when `update` reports dirty-cache handling.

Examples:

```bash
vasir doctor
vasir doctor --json
```

### `repair`

- Purpose: one-command recovery when the repo's Vasir metadata or alias structure drifted.
- Result:
  - repairs `.claude/skills` and `.codex/skills` to point at `.agents/skills` when that is safe
  - rebuilds `.agents/vasir.json` when the repo's explicit tracking policy is missing or invalid
  - rebuilds `.agents/vasir-install-state.json` when the install snapshot is missing or invalid
  - restores missing tracked skills from the installed Vasir bundle
- Notes:
  - `repair` is repo-local only.
  - `repair` preserves explicit repo intent when `.agents/vasir.json` is valid.
  - `repair` does not auto-upgrade already-present skill content to newer Vasir versions; use `vasir diff` and `vasir update` for that.
  - If a tracked skill has safe-to-detect local edits and the existing install snapshot is still valid, `repair` leaves that skill blocked instead of silently blessing the edits.

Examples:

```bash
vasir repair
vasir repair --json
vasir repair --repo-root packages/web
```

### `diff`

- Purpose: review exactly what `vasir update` would change in the current repo before mutating anything.
- Result:
  - compares the repo's tracked `.agents/skills/**` tree against the installed Vasir bundle or local override source
  - shows pending new skills, modified tracked files, blocked updates, and already-current requested skills
  - emits unified text diffs for modified text files and file-level summaries for added or removed files
- Notes:
  - `diff` is read-only.
  - By default, `vasir diff` shows only pending tracked changes and blocked skills.
  - Pass one or more skill names to review only specific tracked skills, including an already-current skill.
  - `--exit-code` returns `1` when tracked changes or blocked skills exist, and `0` when the requested diff set is already current.
  - Pass `--repo-root <path>` when you want to inspect an explicit subproject root.

Examples:

```bash
vasir diff
vasir diff react
vasir diff --json
vasir diff --exit-code
vasir diff --repo-root packages/web
```

### `init`

- Purpose: make first success obvious.
- Result:
  - Outside a repo: `~/.agents/vasir` exists and `~/.claude/vasir` and `~/.codex/vasir` point to it.
  - Inside a repo: the same global cache is prepared, then the full catalog is copied into that repo under `.agents/skills` and the repo is marked to keep tracking the full catalog on future `vasir update` runs.
- Notes:
  - Vasir copies the catalog from the installed package bundle by default.
  - Inside a repo, `init` is the pit-of-success command when you want “just give this repo everything and keep it current.”
  - If the global cache is dirty or contains manual files, `init` moves it aside to `~/.agents/vasir.dirty-backup.<timestamp>` and rebuilds a clean cache.
  - Pass `--repo-root <path>` when you want to initialize a nested package or subproject explicitly.

Examples:

```bash
vasir init
vasir init --repo-root packages/web
```

### `update`

- Purpose: refresh the canonical global catalog and, when applicable, refresh the current repo's installed Vasir skills from it.
- Result:
  - `~/.agents/vasir` syncs to the currently installed bundled catalog, or bootstraps if missing.
  - If the current repo tracks the full catalog, `update` refreshes existing skills and installs any new Vasir skills added since the last repo sync.
  - If the current repo tracks only a selected installed subset, `update` refreshes only that subset.
- Notes:
  - Refuses to update a dirty existing global cache in place; the cache is moved to a timestamped backup before Vasir rebuilds it.
  - Uses the current repo root as the nearest parent containing `.git`, unless `--repo-root <path>` is provided.
  - `vasir init` marks a repo as full-catalog tracking.
  - `vasir add <skill>` preserves an existing explicit `tracking.mode: all`; otherwise it creates or extends selected-subset tracking, so a new or unmanaged repo becomes `selected`.
  - `vasir add all` also marks a repo as full-catalog tracking.
  - `vasir remove <skill>` from a full-catalog repo switches that repo back to selected-subset tracking so the removed skill does not come back unexpectedly.
  - Local edits to a managed skill block replacement and remain untouched, the same way `vasir add <skill> --replace` behaves.
  - If the global cache is dirty or contains manual files, `update` moves it aside to `~/.agents/vasir.dirty-backup.<timestamp>` and rebuilds a clean cache.
  - `--dry-run` shows which repo-local skills would update, which are already current, which are blocked by local edits, and whether the global cache would be quarantined, without mutating the cache or repo.

Example:

```bash
vasir update
vasir update --dry-run
vasir update --repo-root packages/web
```

### `list`

- Purpose: inspect the catalog currently installed in `~/.agents/vasir`.
- Result: skill names grouped by category, or a JSON catalog when `--json` is set.
- Notes:
  - Auto-initializes the global catalog if it is missing.

Example:

```bash
vasir list
```

### `add`

- Purpose: copy one or more skills into the current repo root.
- Result:
  - `.agents/skills/<name>/...` is created in the resolved repo root.
  - `.claude/skills` and `.codex/skills` are repaired as aliases to `.agents/skills`.
  - `AGENTS.md` and `CLAUDE.md` are copied into the repo root when no root contract already exists, using the canonical templates plus an inferred stack snippet when the repo shape is obvious, or the canonical templates alone when it is not.
- Notes:
  - The repo root is the nearest parent containing `.git`.
  - If no `.git` ancestor exists, the current working directory is used.
  - `--repo-root <path>` overrides that detection and treats the provided directory as the repo root.
  - Use `vasir add all` when you want every catalog skill copied into the current repo.
  - `vasir add all` marks the repo to keep tracking the full catalog on later `vasir update` runs.
  - `vasir add <specific skills>` preserves an existing explicit `tracking.mode: all`; otherwise it creates or extends selected-subset tracking for later `vasir update` runs, so a new or unmanaged repo becomes `selected`.
  - Existing project-local skills are never overwritten unless `--replace` is explicitly provided.
  - Pass `--agents-profile backend`, `--agents-profile frontend`, `--agents-profile ios`, or `--agents-profile generic` when you want to override inference and force a specific root-contract profile.
  - If you pass `--agents-profile` and `AGENTS.md` or `CLAUDE.md` already exists, the command refuses to overwrite either file unless `--replace` is explicitly provided.
  - `all` cannot be combined with specific skill names in the same command.

Examples:

```bash
vasir add design__building-frontend
vasir add all
vasir add design__building-frontend --agents-profile frontend
vasir add code__fixing-bugs testing__enforcing-mandate
```

Text-mode success output also prints the resolved project skills directory so you can see exactly where Vasir wrote files.

### `adopt`

- Purpose: bring an existing `.agents/skills` tree under Vasir management without copying or overwriting files.
- Result:
  - rebuilds `.agents/vasir-install-state.json` from the current on-disk skill directories
  - writes `.agents/vasir.json` as the explicit repo tracking and AGENTS profile contract
  - repairs `.claude/skills` and `.codex/skills` to point at `.agents/skills`
  - infers `trackingMode` from the adopted Vasir skill set
- Notes:
  - Use this when a repo already contains `.agents/skills` from an older workflow but Vasir does not recognize it as managed.
  - Unknown local directories are left in place and reported as unmanaged; Vasir only adopts skill names that exist in the current catalog.
  - `adopt` mutates only local tracking metadata and aliases. It does not copy from the global catalog and does not overwrite local skill files.

Examples:

```bash
vasir adopt
vasir adopt --json
vasir adopt --repo-root packages/web
```

### `remove`

- Purpose: delete one or more project-local skills from the resolved repo root.
- Result:
  - `.agents/skills/<name>` is removed when it exists.
  - `.agents/vasir-install-state.json` is updated so Vasir stops tracking the removed skill.
  - `.claude/skills` and `.codex/skills` keep pointing at `.agents/skills`.
- Notes:
  - The repo root is the nearest parent containing `.git`.
  - If no `.git` ancestor exists, the current working directory is used.
  - `--repo-root <path>` overrides that detection and treats the provided directory as the repo root.
  - If you omit skill names in an interactive terminal, Vasir opens a multi-select prompt over the installed project-local skills.
  - Removing a missing skill is a clean no-op and is reported back in the command result.
  - Removing a skill from a repo that was tracking the full catalog switches that repo back to selected-subset tracking so later `vasir update` runs do not reinstall the removed skill.
  - Generated root contracts are not edited automatically; remove or update any routing to the deleted skill yourself.

Examples:

```bash
vasir remove design__building-frontend
vasir remove design__building-frontend testing__enforcing-mandate
vasir remove
```

## Agents

`vasir agents` exists for one generated path: make root and nested root `AGENTS.md` + `CLAUDE.md` pairs obvious to create, refresh, and keep aligned.

Folder `AGENTS.md` files are different. They are hand-authored steering maps for ordinary subtrees. Do not generate them with `vasir agents sync --scope`; use the installed `agents__creating-folder-agents` skill or edit the folder file directly.

### `agents sync`

- Purpose: the one-command generated AGENTS/CLAUDE path for normal repos and nested app/package roots.
- Result:
  - renders `AGENTS.md` and `CLAUDE.md` from the current canonical templates and the inferred or explicit profile
  - stores explicit root profile intent in `.agents/vasir.json`, not in generated root contract files
  - fills the purpose paragraph from deterministic local repo context without a model call
  - generates Section 1 routing from existing repo directories
  - injects repo-owned non-obvious constraints from `AGENTS__non-obvious.md`
  - validates the generated `AGENTS.md` result before writing the pair
- Notes:
  - By default, sync targets the resolved repo root.
  - Use `--scope <path>` when a folder is a nested app/package root, such as `frontend/AGENTS.md` + `frontend/CLAUDE.md` or `apps/web/AGENTS.md` + `apps/web/CLAUDE.md`.
  - Use `--profile frontend`, `--profile backend`, `--profile ios`, or `--profile generic` when inference is wrong or when the scope is mixed.
  - Use `vasir agents sync --dry-run` to preview without writing.
  - The legacy positional profile form, such as `vasir agents sync frontend`, still works, but new scripts should use `--profile`.
  - If `AGENTS__non-obvious.md` is missing, sync creates it. Existing `.agents/non-obvious.md` sidecars are moved to the root file, and legacy manual `AGENTS.md` or `CLAUDE.md` files can seed the root file from the old non-obvious block.
  - Skill catalog updates remain separate: use `vasir update` for tracked `.agents/skills/**` content.

Examples:

```bash
vasir agents sync
vasir agents sync --dry-run
vasir agents sync --profile frontend
vasir agents sync --profile generic
vasir agents sync --scope frontend
vasir agents sync --scope packages/web --profile frontend
vasir agents sync --scope services/api --profile backend
```

### `agents init`

- Purpose: write canonical `AGENTS.md` and `CLAUDE.md` starters into the resolved repo root with selected profile content composed in.
- Result:
  - `AGENTS.md` and `CLAUDE.md` exist in the resolved repo root.
  - Both files have the guessed project name filled in.
  - Both files use the current root operating-contract templates.
  - The `Purpose` block and routing block are still safe placeholders until you replace them manually or via `draft-purpose --write` and `draft-routing --write`.
- Notes:
  - Supported profiles are `backend`, `frontend`, `ios`, and `generic`.
  - The repo root is the nearest parent containing `.git`, unless `--repo-root <path>` is provided.
  - If `AGENTS.md` or `CLAUDE.md` already exists, the command refuses to overwrite either file unless `--replace` is explicitly provided.

Examples:

```bash
vasir agents init backend
vasir agents init frontend --replace
```

### `agents draft-purpose`

- Purpose: inspect the current repo and draft a repo-specific opening paragraph for `AGENTS.md`.
- Result:
  - Prints a 2-3 sentence `Purpose` draft based on local repo context.
  - When `--write` is set, replaces the untouched Vasir placeholder block in `AGENTS.md`.
- Notes:
  - Reads repo-local context such as the root name, top-level entries, `package.json`, and the first screen of `README.md` when present.
  - Defaults to `openai:gpt-5.4`.
  - Accepts the same single-model override surface as eval: `--model openai`, `--model opus`, `--model mock`, or `--model <provider:model>`.
  - `--write` refuses to modify an already edited purpose block and leaves it unchanged. In that case, paste the printed draft manually.
  - `--model mock` is the zero-cost local smoke-test path for the command.

Examples:

```bash
vasir agents draft-purpose
vasir agents draft-purpose --model mock
vasir agents draft-purpose --write --model openai
```

### `agents draft-routing`

- Purpose: inspect the current repo and draft a repo-aware Section 1 routing block for `AGENTS.md`.
- Result:
  - Prints a set of local AGENTS routing lanes based on the actual repo directories.
  - When `--write` is set, replaces the writable routing block in Section 1.
- Notes:
  - Uses deterministic repo signals such as top-level directories and common stack lanes.
  - Drafted lanes point at real directories first, then expect a local `AGENTS.md` inside those directories if the lane truly needs local steering rules.
  - `--write` keeps the routing markers in place until you finalize Section 1. `agents validate` will keep failing until you remove those markers and either create the referenced local `AGENTS.md` files or collapse the rules back into the root file.

Examples:

```bash
vasir agents draft-routing
vasir agents draft-routing --write
```

### `agents validate`

- Purpose: catch leftover scaffold markers and broken repo routes before you treat `AGENTS.md` as finished.
- Result:
  - Succeeds cleanly when `AGENTS.md` no longer contains known placeholders, write-back markers, or broken repo routes.
  - Exits nonzero with structured issue details when scaffold markers are still present or a routed directory is missing its required local `AGENTS.md`.
- Notes:
  - `agents sync` runs this check automatically.
  - Use `--scope <path>` to validate a generated nested root AGENTS file such as `frontend/AGENTS.md`.
  - This is still useful after manual edits or lower-level `agents init`, `agents draft-purpose --write`, and `agents draft-routing --write` flows.
  - Common failures include `[Project Name]`, `[Example]`, untouched purpose/routing markers, missing routed directories, and routed lanes that do not yet own a required local `AGENTS.md`.

Examples:

```bash
vasir agents validate
vasir agents validate --scope frontend
vasir agents validate --json
```

## Eval

Eval has two task shapes: independent benchmarks for comparing the same task against selectable treatments, and legacy suites owned by one skill.

### Independent benchmarks

Use an independent benchmark when the task and scoring contract must remain separate from the skill being tested:

```bash
vasir eval run hyper-scale-chat \
  --treatment skill:plan__question-spec-architecture \
  --open
```

The bundled `hyper-scale-chat` benchmark:

- sends the exact same task and output contract through clean and skill-treated conditions;
- runs each row in a new non-persisted Codex or Claude CLI session with project customizations disabled;
- defaults to 36 distinct GPT-6 Astra, GPT-5.6 Sol/Terra/Luna, historical Claude Fable/Opus, and versioned Claude Fable 5.1 reasoning configurations, for 72 rows at one trial; Astra contributes low, medium, high, xhigh, max, and ultra, while Fable 5.1 contributes xhigh, max, and ultracode;
- uses the logged-in `codex` and `claude` CLIs rather than provider API keys;
- sends each anonymous matched Minimal-baseline/Architecture-skill pair independently to fresh `codex:gpt-6-astra@xhigh` and `claude:claude-fable-5-1@max` judges;
- requires both judges to pass each gate and averages their integer ratings for each weighted dimension, including half points, then recomputes the task's 0–100 rubric score and applies the lowest failed-gate cap;
- uses no synthesizer, peer transform, or cohort-relative score;
- saves the exact prompts, answers, usage, failures, every judge result, panel spread, deterministic aggregate, and row-local score basis under `.agents/vasir-evals/<benchmark>/<run-id>/run.json`;
- derives a self-contained `report.html` with embedded D3. `run.json` remains authoritative.

The default matrix can be narrowed without collapsing model and reasoning identity:

```bash
# Every supported Sol reasoning effort
vasir eval run hyper-scale-chat \
  --treatment skill:plan__question-spec-architecture \
  --model sol

# One exact model/reasoning configuration
vasir eval run hyper-scale-chat \
  --treatment skill:plan__question-spec-architecture \
  --model claude:opus@max

# Apply the same requested efforts to the selected models
vasir eval run hyper-scale-chat \
  --treatment skill:plan__question-spec-architecture \
  --model sol --model terra \
  --reasoning xhigh --reasoning max
```

Extend one immutable completed benchmark with new exact configurations without regenerating its existing responses:

```bash
vasir eval extend hyper-scale-chat <source-run-id> \
  --model claude:claude-fable-5-1@xhigh \
  --model claude:claude-fable-5-1@max \
  --model claude:claude-fable-5-1@ultracode
```

`eval extend` infers the benchmark treatment and trial count from the named source, rejects any incompatible or duplicate row basis, and generates only the added cells. Under the same score edition, it preserves every source row and its row-local score basis, then judges only the added matched pairs with the fixed two-judge panel. Completion still requires every row in the combined artifact to be generated and scored. It never mutates the source. Each `--model` must include its exact effort or mode.

When the source belongs to a frozen score edition, extending it with a model runs and scores only that model's six new responses across the three tasks and two conditions. The three matched pairs require six judge calls. Existing task scores, aggregate scores, and paired uplift remain unchanged; only derived ranks may move. If the task, rubric, generation contract, judge panel, aggregation method, task weights, or trial policy changes, publish those results under a new score edition rather than mixing them into the existing board.

Fable 5.1 Ultracode is the versioned v2 execution mode: xhigh plus exactly one single-phase Workflow containing exactly one worker, not a native Claude effort tier. Ordinary rows finish first; Ultracode rows then run serially. The Claude invocation sets `workflowSizeGuideline` to `small` and gives the background Workflow 15 minutes inside the benchmark harness's 20-minute process deadline. Claude Code 2.1.257 or newer and environment pins force the worker to `claude-fable-5-1`. The sanitized runtime receipt must prove one correlated completed Workflow and one local, uncached, completed Fable 5.1 worker, with no fallback, remote, cached, errored, missing-model, or extra worker evidence. Missing or contradictory evidence fails the row closed.

All Fable 5.1 receipts require target-model attribution and allow only Fable 5.1 plus optional ancillary Haiku 4.5 query-pipeline usage. Haiku traffic is not Workflow-worker evidence.

Regenerate or reopen the latest or a named saved report without rerunning models:

```bash
vasir eval report hyper-scale-chat --open
vasir eval report hyper-scale-chat <run-id> --open
```

Apply the benchmark's current judge panel to saved responses without rerunning generation. This writes a new linked run and preserves the source artifact. Scoring runs one matched pair per prompt, checkpoints every judge/pair batch, and safely reuses compatible completed batches when retrying an interrupted rescore:

```bash
vasir eval rescore hyper-scale-chat <run-id>
vasir eval report hyper-scale-chat --open
```

Engineering v2 is a development, uncalibrated score over three related Backend Architecture tasks with one trial per task and condition. It is useful for this model field, not a universal ranking or broad Engineering measure. Its chat task overlaps a worked default in the architecture skill, so it measures retrieval and application of that guidance rather than novel-task generalization. Inspect the complete answers, per-judge ratings, and panel spread in the report.

### Legacy skill-owned evals

`vasir eval run <skill>` remains the one-command developer workflow for measuring a skill with the suite stored beside that skill.

```bash
vasir eval run testing__enforcing-mandate
```

What it does:

- Resolves the skill from the local repo first:
  - `.agents/skills/<skill>/...` when the current repo already contains that skill, whether you are editing the source catalog in Vasir or evaluating an installed project-local copy
  - falls back to the global catalog copy if neither local path exists
- Loads the built-in suite that lives beside that resolved skill source:
  - `.agents/skills/<skill>/evals/suite.json`
  - the matching global catalog skill directory when falling back globally
- Runs the same case set twice for every configured model:
  - baseline: no skill
  - treatment: with the skill
- Repeats every model/case baseline-vs-treatment pair 3 times by default so a single lucky sample does not dominate the result.
- Launches the planned model/case/condition rows with bounded concurrency and streams completion progress.
- On TTYs, renders a live animated spinner/progress row while the batch is in flight.
- Scores every output with built-in hard checks from each case's `requiredSubstrings` and `forbiddenSubstrings`.
- Every case must define at least one hard check. `judgePrompt` augments that floor; it does not replace it.
- If the suite defines `judgePrompt`, Vasir also runs the fixed OpenAI + Anthropic pairwise judges on top of that hard-check floor.
- Stores local run history under `.agents/vasir-evals/<skill>/...`.
- Prints a compact narrative summary first:
  - overall verdict
  - a short summary generated from the saved eval facts, using an LLM when available
  - a few decisive reasons
  - the next recommended action
- Points you to `vasir eval inspect <skill> [run-id]` for the full pair-level drill-down.
- Prints usage totals when the provider reports them.
- Marks the run `COMPLETE` or `INCOMPLETE` and keeps successful rows even if some provider rows fail.

Local provider keys:

- Create `keys.json` at the repo root by copying [keys.json.example](../keys.json.example).
- Supported keys are:
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `OPENAI_BASE_URL`
  - `ANTHROPIC_BASE_URL`
- Environment variables still work and win over `keys.json`.
- Interactive prompting only fills keys that are still missing after env vars and `keys.json` are applied.

Built-in defaults:

- `openai:gpt-5.4`
- `anthropic:claude-opus-4-6`

Override surface:

- Pass `--model openai` for only OpenAI with the default model.
- Pass `--model opus` for only Anthropic Opus 4.6.
- Pass `--model mock` for a zero-cost local smoke test.
- Pass `--model <provider:model>` for an explicit full descriptor.
- Repeat `--model` to evaluate multiple explicit models in one run.
- Pass `--trials <count>` to override the default 3-trial run plan.

Examples:

```bash
vasir eval run testing__enforcing-mandate

# repo-local wrapper with the same built-in defaults
npm run eval testing__enforcing-mandate

# inspect the latest saved testing__enforcing-mandate eval
vasir eval inspect testing__enforcing-mandate

# rescore the latest saved testing__enforcing-mandate eval with the current scorer
vasir eval rescore testing__enforcing-mandate

# repo-local zero-cost smoke test without the npm -- delimiter
npm run eval testing__enforcing-mandate mock

# only OpenAI gpt-5.4
vasir eval run testing__enforcing-mandate --model openai

# zero-cost local smoke test
vasir eval run testing__enforcing-mandate --model mock

# explicit multi-model override
vasir eval run testing__enforcing-mandate --model openai:gpt-5.4 --model anthropic:claude-opus-4-6
```

Notes:

- The built-in eval path is suite-owned and single-shape:
  - every suite defines case-level hard checks
  - a suite may add `judgePrompt` to turn on the fixed OpenAI + Anthropic judge layer
- If the fixed judges are unavailable, the hard-check section still renders. Unless the hard floor independently proves a regression, the CLI comparison remains `NO SIGNAL`; product-facing reporting maps that to `ProductClaim: UNVERIFIED` with `EvidenceReason: NO_SIGNAL`. Neither is a pass.
- Older `mode: "command"` and `mode: "judge"` suites are rejected with a migration error. Rewrite them as hard checks plus optional `judgePrompt`.
- The `run` command now optimizes for a short verdict first; use `inspect` when you want the per-pair evidence.
- `run` now defaults to 3 trials per model/case pair. Use `--trials 1` if you want the fastest or cheapest possible check.
- `inspect` reopens a saved run and shows the pair-level swings, the baseline and treatment outputs, and the saved judge reasons when they exist.
- Historical comparisons still use the latest recorded comparable runs behind the summary.
- `rescore` rereads the saved outputs and recomputes `hardScore` with the current scorer. This is the fix path after scorer bugs or scorer improvements.
- Token totals are only available when the provider returns usage. Live OpenAI and Anthropic runs should report them. `--model mock` shows usage as unavailable.
- If a default live provider is missing credentials and the terminal is interactive, Vasir prompts you to paste a key or skip that provider.
- In non-interactive environments, missing live-provider credentials cause those providers to be skipped. If nothing runnable remains, the command fails cleanly and points you to `--model mock`.
- Live provider rows use a request timeout. If a row times out or a provider call fails, the run stays on disk and the final report is marked incomplete instead of discarding the successful rows.
- `npm run eval` prints setup, launches the batch in parallel, streams completions, and accepts positional model shorthands like `npm run eval testing__enforcing-mandate mock` or `npm run eval testing__enforcing-mandate openai`.
- Eval artifacts are tool-owned local files and are ignored by this repo via `.agents/vasir-evals/`.
- Every saved run is stored as a single `run.json` artifact.

## Benchmark Publication

### `benchmark publish`

`vasir benchmark publish` is the only supported production publication path for the accepted static VasirBench site.

```text
vasir benchmark publish [--dry-run] [--full-audit] [--json] [--repo-root <path>]
```

The target is fixed in the repository deployment configuration:

- public URL: `https://vasirbenchmark.com`
- AWS CLI profile: `faedark`
- required AWS account: `339713108333`
- region: `us-east-1`
- CloudFormation stack: `vasirbenchmark-production`

The command accepts no domain, profile, account, region, bucket, distribution, stack, release, or force override. It checks that `faedark` resolves to account `339713108333` before any AWS mutation.

Prerequisites:

- Run from the Vasir source repository, or pass its root with `--repo-root <path>`.
- Install the AWS CLI and configure an authenticated profile named `faedark`.
- Chrome or Chromium is needed only with `--full-audit`, not for a normal publication.
- Keep `site/vasirbenchmark.com/template-lock.json` matched to the accepted presentation source, capture harness, and canonical captures. Generated public data is verified separately from source truth. There is no acceptance bypass.

Confirm the AWS identity without changing cloud state:

```bash
aws sts get-caller-identity --profile faedark --region us-east-1
```

The `Account` value must be `339713108333`.

The normal publication flow is one command:

```bash
vasir benchmark publish
```

Use `vasir benchmark publish --dry-run` when you want the same local projection, artifact, route, acceptance-receipt, tool, and read-only identity checks without publishing. It does not deploy CloudFormation, write or delete S3 objects, acquire or release the publisher lease, activate a release, or change DNS. Its ordered action list identifies every AWS mutation the normal command would perform.

The publishing command:

1. Builds the bounded artifact and deterministic release identifier.
2. Verifies the fixed AWS account and converges the `vasirbenchmark-production` stack.
3. Acquires the conditional publisher lease so only one activation can run at a time.
4. Reuses unchanged content-addressed assets from the last verified release manifest and uploads new immutable files with checksums. Ownership is checked at phase boundaries, not once per retained asset.
5. Activates that release through the stack-owned CloudFront Function pointer, then invalidates and awaits the configured stable HTML entrypoints.
6. Verifies the active release's site bytes, newly published assets, HTTPS, security headers and private origin. It reuses the unchanged Games asset library, retaining one HTML isolation probe, and does not launch the whole-site browser suite.
7. Retains the active release, the immediately previous verified release, and releases younger than 30 days, then releases the publisher lease.

Publication is idempotent for identical source bytes. A rerun uses the same release identifier and does not create a second stack or duplicate release.

Use `vasir benchmark publish --full-audit` when an exhaustive asset-integrity and
browser regression audit is explicitly wanted. This opts back into checking
retained assets and running the desktop/mobile browser journeys. Normal
publication reports the checks it actually performed; manifest reuse is not a
claim that an unchanged asset was freshly downloaded or played.

#### Public score edition

The active public score edition is `backend-architecture-panel-consensus-v2`, displayed as **Engineering v2**. The edition freezes three task-owned 0–100 rubrics, this exact judge panel, and equal task weights:

- `codex:gpt-6-astra@xhigh`
- `claude:claude-fable-5-1@max`

Each judge sees one stable matched Minimal-baseline/Architecture-skill pair. The aggregation method is `unanimity-gates-mean-dimensions-v1`: both judges must pass each gate, either failure applies its cap, and each dimension uses the arithmetic mean of the two integer ratings, including half points. The benchmark recomputes the weighted task score and applies the lowest failed-gate cap. There is no synthesizer. For each exact model/reasoning configuration and condition:

```text
absolute score = mean(chat task score, feed task score, telemetry task score)
paired uplift = Architecture skill absolute score - Minimal baseline absolute score
```

The primary `/100` value is therefore a fixed rubric score, not a percentile, peer index, Elo rating, win rate, or transform of the currently published model field. Paired uplift is expressed in rubric points. Rank is derived from the unrounded Architecture skill score and is secondary; adding a model can move rank but cannot change an incumbent score or uplift.

This edition has three tasks and one trial per task and condition. Its uncertainty status is `not-estimated`; the publisher does not infer a confidence interval from those observations. Per-response judge spread and calibration status remain score metadata. The UI summarizes the method as `Engineering v2 · 3 tasks × 1 trial · 2 judges`.

Adding a compatible model requires only the new model's six responses and six judge calls across the three frozen tasks. Incumbent rows are not rescored. Changing the tasks, rubrics, task weights, judge panel, aggregation method, generation contract, or trial policy requires a new score edition. A scoring-edition change may rescore saved generations into a new linked artifact; it never overwrites the historical edition.

Flags:

| Flag | Behavior |
| --- | --- |
| `--dry-run` | Runs local and read-only preflight checks, emits the resolved plan, and performs no AWS mutation |
| `--json` | Suppresses progress and writes exactly one schema-versioned JSON object; errors remain nonzero structured errors |
| `--repo-root <path>` | Changes only which source repository is inspected; it does not override any production target field |

#### Public artifact boundary

The public artifact contains eight checked-in presentation files plus two generated data modules:

- `index.html`
- `style.css`
- `assets/d3.v7.min.js`
- `app.js`
- `benchmark-report.html`
- `benchmark-report.css`
- `benchmark-report.js`
- `assets/kanit-latin-900-normal.woff2`

The ninth member, `data.js`, is regenerated deterministically from the canonical benchmark taxonomy, checked-in benchmark definitions, and `benchmarks/public-results.json`. The tenth, `responses.js`, is generated from the same selected rows and is loaded only by benchmark reports. The publisher does not trust or copy either checked-in inspection snapshot.

`benchmarks/public-results.json` selects immutable local `run.json` artifacts by benchmark id, path, and SHA-256. The selected private artifacts are build inputs, not public files: the projector emits allowlisted score and presentation fields into `data.js`, plus explicit row identity, content-addressed exact generation messages, verbatim model output, and two allowlisted judge scores, gate mechanics, and bounded answer-specific rationales into `responses.js`. It never publishes local paths, raw judge prompts or completions, treatment content, receipts, or holdouts.

The September 2026 public projection contains three digest-pinned development result sets in one Engineering category and one Backend Architecture track: three benchmarks, 36 matched model/reasoning settings, Minimal baseline plus Architecture skill, 72 condition entries, 216 benchmark response cells, and 432 individual judge evaluations. Every saved response is rescored under Engineering v2 without regenerating its answer. The exact roster preserves the 30 published settings, including Claude Fable 5.1 at xhigh, max, and ultracode, and adds GPT-6 Astra at low, medium, high, xhigh, max, and ultra. It publishes the Engineering v2 score for each condition, paired rubric-point uplift, all three task-local scores, derived ranks, observed outcomes, latency, token usage, and the fixed two-judge scoring method. Cost is omitted because attribution is incomplete. The result surface is labeled `Engineering v2 · 3 tasks × 1 trial · 2 judges`.

The generated data drives the accepted full interface rather than replacing it. Combined and Engineering Leaderboard, Benchmark tests, and Efficiency routes retain the paired D3 comparisons, shared scale, synchronized guide, and three benchmark reports. Unsupported future families and resource axes are omitted; removing those analytical views is not a valid way to remove unsupported data.

The publisher does not upload capture scripts, screenshots, documentation, infrastructure sources, deployment manifests, `template-lock.json`, or private run evidence. Missing, symlinked, non-regular, oversized, or unexpectedly linked artifact files fail validation before AWS mutation.

Limits:

- at most 2 MiB per file
- at most 5 MiB for the complete raw artifact
- at most 250 KiB gzip-compressed for the landing page and its first-load CSS, JavaScript, data, and font dependencies
- at most 1 GiB for retained releases plus the candidate before upload

#### JSON result

Success and dry-run results use schema version 1 and include:

- `command: "benchmark"`, `subcommand: "publish"`, `status`, `schemaVersion`, and `dryRun`
- `target`: URL, domain, profile, account, region, and stack name
- `artifact`: release identifier, file count, byte totals, per-file hashes, the complete entrypoint/family/view/report route arrays, and the generated projection summary, including development, verified/eligible, setting, entry, and response counts
- `deployment`: previous and active release identifiers, AWS output identifiers, and rollback outcome
- `verification`: status, verified file and route counts, and origin-privacy result
- `actions[]`: the deterministic production plan

Each action has `{id, stage, status, mutatesAws}`. Action status is `completed`, `planned`, or `skipped`. The stable action identifiers, in order, are:

1. `validate-acceptance`
2. `build-artifact`
3. `assert-identity`
4. `converge-infrastructure`
5. `acquire-lease`
6. `cleanup-releases`
7. `stage-release`
8. `activate-release`
9. `verify-publication`
10. `release-lease`

Dry-run preserves the same result keys. Unknown AWS output identifiers are `null`, `verification.status` is `planned`, local and read-only actions that ran are `completed`, and mutating actions are `planned`. `deployment.activeReleaseId` is the currently observed stack value or `null`; the candidate remains `artifact.releaseId` and is never reported as active during dry-run. Human and JSON modes expose the same target, artifact, action, deployment, and verification facts.

The normal command succeeds after the fast live-release checks pass. Its final output includes `https://vasirbenchmark.com`, the active release identifier and the verification mode; exhaustive browser checks require `--full-audit`. See [Benchmark Publication Errors](./troubleshooting.md#benchmark-publication-errors) for stable error codes and recovery.

## Version

Use this when you need to confirm the installed CLI version before troubleshooting or reporting a bug.

```bash
vasir --version
```

Expected text output:

```text
vasir 0.1.0
```

## Replace

`--replace` is the explicit refresh path for an existing project-local skill copy.

```bash
vasir add design__building-frontend --replace
```

Facts:

- `--replace` is supported only by `vasir add`.
- Vasir refreshes from the global catalog only when the existing project-local skill still matches the last Vasir-managed snapshot.
- That snapshot lives at `.agents/vasir-install-state.json` in the resolved repo root.
- If the skill directory has local edits, unexpected files, or no tracked snapshot, the command refuses to overwrite it, preserves its files, and tells you to back up or delete the directory manually first.

## JSON Output

`--json` is supported by `status`, `context`, `doctor`, `repair`, `diff`, `init`, `update`, `list`, `add`, `adopt`, `remove`, `agents sync`, `agents init`, `agents draft-purpose`, `agents draft-routing`, `agents validate`, `benchmark publish`, and `eval run`.

Success envelope:

- `command`
- `status`
- `schemaVersion`, `execution`, `catalog`, `repoFacts`, `agentsProfile`, `trackedSkills`, `recommendedSkillNames`, `recommendedSkills[]`, `relevantAgentsFiles[]`, `pendingSkillChanges`, `nextActions[]`, and `warnings[]` for `context`
- `debug` for `context` when `--debug` is set
- `globalCatalogDirectory` for `status`, `doctor`, `init`, `update`, `list`, `add`, and `adopt`
- `overallStatus` plus `nextSteps[]` for `status`, `doctor`, `repair`, and `diff`
- `projectConfigFilePath`, `repoStatus`, `trackingMode`, `managedSkills`, `installStateSkills`, and `unmanagedSkills` for `status`
- `checks[]` and `issues[]` for `doctor`
- `catalogSourceDirectory`, `trackingMode`, `trackingSource`, `rebuiltProjectConfig`, `rebuiltInstallState`, and `restoredSkills[]` for `repair`
- `catalogSourceDirectory`, `trackingMode`, `requestedSkills`, `hasDiff`, `hasBlockedSkills`, and `skills[]` for `diff`
- `projectRootDirectory`, `projectConfigFilePath`, `projectSkillsDirectory`, `updatedSkills`, `agentsFilePath`, `claudeFilePath`, `wroteAgentsFile`, and `wroteClaudeFile` for repo-local `init` and `update`
- `skills` for `list`
- `projectRootDirectory`, `projectConfigFilePath`, `projectSkillsDirectory`, `installedSkills`, `replacedSkills`, `agentsFilePath`, `claudeFilePath`, `wroteAgentsFile`, and `wroteClaudeFile` for `add`
- `subcommand`, `agentsFilePath`, `claudeFilePath`, `profile`, `wroteAgentsFile`, and `wroteClaudeFile` for `agents init`
- `subcommand`, `agentsFilePath`, `claudeFilePath`, `profile`, `profileSource`, `purposeSource`, `nonobviousFilePath`, `wroteAgentsFile`, `wroteClaudeFile`, `wroteNonobviousFile`, `routingLines[]`, and `issues[]` for `agents sync`
- `projectRootDirectory`, `projectConfigFilePath`, `projectSkillsDirectory`, `adoptedSkills`, and `skippedSkills` for `adopt`
- `projectRootDirectory`, `projectConfigFilePath`, `projectSkillsDirectory`, `removedSkills`, and `missingSkills` for `remove`
- `subcommand`, `schemaVersion`, `dryRun`, `target`, `artifact`, `deployment`, `verification`, and `actions[]` for `benchmark publish`

`list --json` returns `skills[]` entries with:

- `name`
- `path`
- `entry`
- `description`
- `category`
- `tags`
- `version`
- `recommends`
- `files`

Error envelope:

- `command`
- `status`
- `code`
- `message`
- `suggestion`
- `context`
- `docsRef`

`docsRef` is a stable GitHub URL pointing at the exact recovery or reference section for that error.

Example success envelope:

```json
{
  "command": "add",
  "status": "success",
  "globalCatalogDirectory": "/Users/example/.agents/vasir",
  "projectRootDirectory": "/repo",
  "projectSkillsDirectory": "/repo/.agents/skills",
  "installedSkills": ["design__building-frontend"],
  "replacedSkills": [],
  "agentsFilePath": "/repo/AGENTS.md",
  "claudeFilePath": "/repo/CLAUDE.md",
  "wroteAgentsFile": true,
  "wroteClaudeFile": true
}
```

Example eval success envelope:

```json
{
  "command": "eval",
  "status": "success",
  "subcommand": "run",
  "runId": "2026-03-18T12-00-00-000Z__abc123def456",
  "skillName": "testing__enforcing-mandate",
  "suiteId": "testing-value-path",
  "suiteHash": "4d5e6f...",
  "runStatus": "complete",
  "trialCount": 3,
  "scorerVersion": 4,
  "modelIds": ["mock:skill-aware"],
  "outputDirectory": "/repo/.agents/vasir-evals/testing__enforcing-mandate/2026-03-18T12-00-00-000Z__abc123def456",
  "summary": {
    "rowCounts": {
      "planned": 6,
      "scored": 6,
      "failed": 0
    },
    "global": {
      "averageScoreLift": 0.5,
      "medianScoreLift": 0.5,
      "passRateLift": 1,
      "winRate": 1,
      "directionConfidence": 0.875,
      "comparablePairCount": 6,
      "totalPairCount": 6
    }
  }
}
```

Example error envelope:

```json
{
  "command": "add",
  "status": "error",
  "code": "PROJECT_SKILL_UNTRACKED",
  "message": "Project skill cannot be safely replaced because Vasir has no install snapshot for /repo/.agents/skills/design__building-frontend.",
  "suggestion": "Delete the project-local skill directory manually if you want a fresh copy, then rerun `vasir add <skill>`.",
  "context": {},
  "docsRef": "https://github.com/erikhazzard/vasir/blob/main/docs/troubleshooting.md#replace-safety-errors"
}
```

## Filesystem Contract

Global:

```text
~/.agents/vasir
~/.claude/vasir -> ~/.agents/vasir
~/.codex/vasir -> ~/.agents/vasir
```

Project-local:

```text
.git/
.agents/vasir.json
.agents/vasir-install-state.json
.agents/skills/<name>/
.claude/skills -> .agents/skills
.codex/skills -> .agents/skills
```

Project-local skills are copied files that you own and can edit. They are never linked back to the global catalog.
`.agents/vasir.json` is the committed repo-level source of truth for what the repo wants Vasir to track and which root AGENTS profile it should preserve.
`.agents/vasir-install-state.json` is Vasir's operational snapshot of which files it last installed for each project-local skill. Vasir uses it to make `add --replace` refuse to overwrite edited copies and preserve their files, prunes entries automatically when the matching skill directory is gone, and records catalog provenance such as the installed Vasir version, catalog hash, and per-skill source version so `vasir update --dry-run` can explain pending refreshes.

## Advanced Override

`VASIR_REPOSITORY_URL` is a troubleshooting override for local testing or mirror scenarios.
It only accepts a local directory path or `file:///...` URL that already contains `registry.json`, `.agents/skills/`, and `templates/`.

```bash
VASIR_REPOSITORY_URL=file:///absolute/path/to/vasir-fixture-repo vasir init
```

Normal installs should not set it.

## Related Pages

- [README.md](../README.md)
- [docs/troubleshooting.md](./troubleshooting.md)
- [docs/create-your-first-skill.md](./create-your-first-skill.md)
