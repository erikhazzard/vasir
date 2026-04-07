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
| `init` | `vasir init [--json] [--repo-root <path>]` | Sync the installed bundled catalog into `~/.agents/vasir`; inside a repo, also install and track the full catalog there |
| `update` | `vasir update [--json] [--dry-run] [--repo-root <path>]` | Sync `~/.agents/vasir`; then refresh whatever that repo is tracking: the full catalog or a selected installed subset |
| `list` | `vasir list [--json]` | Read the global catalog and list available skills |
| `add` | `vasir add <skill> [skill...] [--json] [--replace] [--agents-profile <name>] [--repo-root <path>]` | Copy skills into the current repo root at `.agents/skills`, with optional one-command AGENTS scaffolding; use `vasir add all` for the full catalog |
| `remove` | `vasir remove <skill> [skill...] [--json] [--repo-root <path>]` | Remove project-local skills from the current repo root |
| `agents init` | `vasir agents init <backend\|frontend\|ios> [--json] [--replace] [--repo-root <path>]` | Write a stack-specific `AGENTS.md` starter in the current repo root |
| `agents draft-purpose` | `vasir agents draft-purpose [--json] [--write] [--model <name>] [--repo-root <path>]` | Draft a repo-specific `Purpose` paragraph for the current repo root `AGENTS.md` |
| `agents draft-routing` | `vasir agents draft-routing [--json] [--write] [--repo-root <path>]` | Draft repo-aware Section 1 routing lanes for the current repo root `AGENTS.md` |
| `agents validate` | `vasir agents validate [--json] [--repo-root <path>]` | Fail closed when `AGENTS.md` still contains scaffold placeholders or broken repo routes |
| `eval run` | `vasir eval run <skill> [--json] [--model <name>] [--trials <count>] [--repo-root <path>]` | Run the built-in baseline vs treatment eval for a skill |
| `eval inspect` | `vasir eval inspect <skill> [run-id] [--json] [--repo-root <path>]` | Inspect the latest or named saved eval artifact for a skill |
| `eval rescore` | `vasir eval rescore <skill> [run-id] [--json] [--repo-root <path>]` | Recompute a saved eval artifact with the current scorer |
| `--version` | `vasir --version [--json]` | Print the installed CLI name and version |

### `init`

- Purpose: make first success obvious.
- Result:
  - Outside a repo: `~/.agents/vasir` exists and `~/.claude/vasir` and `~/.codex/vasir` point to it.
  - Inside a repo: the same global cache is prepared, then the full catalog is copied into that repo under `.agents/skills` and the repo is marked to keep tracking the full catalog on future `vasir update` runs.
- Notes:
  - Vasir copies the catalog from the installed package bundle by default.
  - Inside a repo, `init` is the pit-of-success command when you want “just give this repo everything and keep it current.”
  - Pass `--repo-root <path>` when you want to initialize a nested package or subproject explicitly.
  - If the existing global cache is dirty or invalid, the command fails closed.

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
  - Fails closed if the existing global cache is dirty.
  - Uses the current repo root as the nearest parent containing `.git`, unless `--repo-root <path>` is provided.
  - `vasir init` marks a repo as full-catalog tracking.
  - `vasir add <skill>` marks a repo as selected-subset tracking.
  - `vasir add all` also marks a repo as full-catalog tracking.
  - `vasir remove <skill>` from a full-catalog repo switches that repo back to selected-subset tracking so the removed skill does not come back unexpectedly.
  - Local edits to a managed skill still fail closed, the same way `vasir add <skill> --replace` does.
  - `--dry-run` shows which repo-local skills would update, which are already current, and which are blocked by local edits without mutating the cache or repo.

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
  - `AGENTS.md` is copied into the repo root if it does not already exist, using an inferred stack-specific starter when the repo shape is obvious, or the canonical blank template when it is not.
- Notes:
  - The repo root is the nearest parent containing `.git`.
  - If no `.git` ancestor exists, the current working directory is used.
  - `--repo-root <path>` overrides that detection and treats the provided directory as the repo root.
  - Use `vasir add all` when you want every catalog skill copied into the current repo.
  - `vasir add all` marks the repo to keep tracking the full catalog on later `vasir update` runs.
  - `vasir add <specific skills>` marks the repo to keep tracking only those installed skills on later `vasir update` runs.
  - Existing project-local skills are never overwritten unless `--replace` is explicitly provided.
  - Pass `--agents-profile backend`, `--agents-profile frontend`, or `--agents-profile ios` when you want to override inference and force a specific AGENTS starter.
  - If you pass `--agents-profile` and `AGENTS.md` already exists, the command fails closed unless `--replace` is explicitly provided.
  - `all` cannot be combined with specific skill names in the same command.

Examples:

```bash
vasir add design__building-frontend
vasir add all
vasir add design__building-frontend --agents-profile frontend
vasir add code__fixing-bugs testing__enforcing-mandate
```

Text-mode success output also prints the resolved project skills directory so you can see exactly where Vasir wrote files.

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
  - `AGENTS.md` is not edited automatically; remove or update any routing to the deleted skill yourself.

Examples:

```bash
vasir remove design__building-frontend
vasir remove design__building-frontend testing__enforcing-mandate
vasir remove
```

## Agents

`vasir agents` exists for one job: make the repo-root `AGENTS.md` obvious to scaffold and obvious to customize.

### `agents init`

- Purpose: write a stack-specific `AGENTS.md` starter into the resolved repo root.
- Result:
  - `AGENTS.md` exists in the resolved repo root.
  - The file has the guessed project name filled in.
  - The file has a loud `EDIT THESE FIRST` block at the top.
  - The `Purpose` block and Section 1 routing block are still safe placeholders until you replace them manually or via `draft-purpose --write` and `draft-routing --write`.
- Notes:
  - Supported profiles are `backend`, `frontend`, and `ios`.
  - The repo root is the nearest parent containing `.git`, unless `--repo-root <path>` is provided.
  - If `AGENTS.md` already exists, the command fails closed unless `--replace` is explicitly provided.

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
  - `--write` fails closed if the purpose placeholder has already been edited. In that case, paste the printed draft manually.
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
  - Prints a set of scoped routing lanes based on the actual repo directories.
  - When `--write` is set, replaces the writable routing block in Section 1.
- Notes:
  - Uses deterministic repo signals such as top-level directories and common stack lanes.
  - Drafted lanes point at real directories first, then expect a local `AGENTS.md` inside those directories if the lane truly needs scoped rules.
  - `--write` keeps the routing markers in place until you finalize Section 1. `agents validate` will keep failing until you remove those markers and either create the referenced scoped `AGENTS.md` files or collapse the rules back into the root file.

Examples:

```bash
vasir agents draft-routing
vasir agents draft-routing --write
```

### `agents validate`

- Purpose: catch leftover scaffold markers and broken repo routes before you treat `AGENTS.md` as finished.
- Result:
  - Succeeds cleanly when `AGENTS.md` no longer contains known placeholders, write-back markers, or broken repo routes.
  - Fails closed with structured issue details when scaffold markers are still present or a routed directory is missing its scoped `AGENTS.md`.
- Notes:
  - This is the last step after `agents init`, `agents draft-purpose --write`, and `agents draft-routing --write`.
  - Common failures include the `EDIT THESE FIRST` block, `[Project Name]`, `[Example]`, untouched purpose/routing markers, missing routed directories, and routed lanes that do not yet own a local `AGENTS.md`.

Examples:

```bash
vasir agents validate
vasir agents validate --json
```

## Eval

`vasir eval run <skill>` is the one-command developer workflow for measuring whether a skill improved steering.

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
- If the fixed judges are unavailable, the hard-check section still renders, but the top-line verdict fails closed to `NO SIGNAL` unless the hard floor itself regresses.
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
- If the skill directory has local edits, unexpected files, or no tracked snapshot, the command fails closed and tells you to back up or delete the directory manually first.

## JSON Output

`--json` is supported by `init`, `update`, `list`, `add`, `remove`, and `eval run`.

Success envelope:

- `command`
- `status`
- `globalCatalogDirectory` for `init`, `update`, `list`, and `add`
- `projectRootDirectory`, `projectSkillsDirectory`, and `updatedSkills` for `update`
- `skills` for `list`
- `projectRootDirectory`, `projectSkillsDirectory`, `installedSkills`, and `replacedSkills` for `add`
- `projectRootDirectory`, `projectSkillsDirectory`, `removedSkills`, and `missingSkills` for `remove`

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
  "replacedSkills": []
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
.agents/vasir-install-state.json
.agents/skills/<name>/
.claude/skills -> .agents/skills
.codex/skills -> .agents/skills
```

Project-local skills are copied files that you own and can edit. They are never linked back to the global catalog.
`.agents/vasir-install-state.json` is Vasir's local snapshot of which files it last installed for each project-local skill. Vasir uses it to make `add --replace` fail closed on edited copies, prunes entries automatically when the matching skill directory is gone, and records catalog provenance such as the installed Vasir version, catalog hash, and per-skill source version so `vasir update --dry-run` can explain pending refreshes.

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
