# Vasir CLI Reference

Use this page when you need facts about commands, flags, JSON output, filesystem layout, or the supported CLI override surface.

## Install

Until Vasir is published on npm, install it directly from GitHub:

```bash
npm install -g git+https://github.com/erikhazzard/vasir.git
```

Verify the installed binary:

```bash
vasir --version
```

## Commands

| Command | Syntax | What it does |
| --- | --- | --- |
| `init` | `vasir init [--json]` | Clone or refresh `~/.agents/vasir` and repair global aliases |
| `update` | `vasir update [--json]` | Fast-forward `~/.agents/vasir`; bootstraps if missing |
| `list` | `vasir list [--json]` | Read the global catalog and list available skills |
| `add` | `vasir add <skill> [skill...] [--json] [--replace]` | Copy skills into the current repo root at `.agents/skills` |
| `remove` | `vasir remove <skill> [skill...] [--json]` | Remove project-local skills from the current repo root |
| `eval run` | `vasir eval run <skill> [--json] [--model <name>] [--trials <count>]` | Run the built-in baseline vs treatment eval for a skill |
| `eval inspect` | `vasir eval inspect <skill> [run-id] [--json]` | Inspect the latest or named saved eval artifact for a skill |
| `eval rescore` | `vasir eval rescore <skill> [run-id] [--json]` | Recompute a saved eval artifact with the current scorer |
| `--version` | `vasir --version [--json]` | Print the installed CLI name and version |

### `init`

- Purpose: prepare the canonical global catalog.
- Result: `~/.agents/vasir` exists and `~/.claude/vasir` and `~/.codex/vasir` point to it.
- Notes:
  - Requires Git on `PATH`.
  - If the existing global clone is dirty or invalid, the command fails closed.

Example:

```bash
vasir init
```

### `update`

- Purpose: refresh the canonical global catalog without touching any current project.
- Result: `~/.agents/vasir` fast-forwards to the latest upstream state, or bootstraps if missing.
- Notes:
  - Fails closed if the existing global clone is dirty.

Example:

```bash
vasir update
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
  - `AGENTS.md` is copied into the repo root if it does not already exist.
- Notes:
  - The repo root is the nearest parent containing `.git`.
  - If no `.git` ancestor exists, the current working directory is used.
  - Existing project-local skills are never overwritten unless `--replace` is explicitly provided.

Examples:

```bash
vasir add react
vasir add react netcode
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
  - If you omit skill names in an interactive terminal, Vasir opens a multi-select prompt over the installed project-local skills.
  - Removing a missing skill is a clean no-op and is reported back in the command result.
  - `AGENTS.md` is not edited automatically; remove or update any routing to the deleted skill yourself.

Examples:

```bash
vasir remove react
vasir remove react roguelike
vasir remove
```

## Eval

`vasir eval run <skill>` is the one-command developer workflow for measuring whether a skill improved steering.

```bash
vasir eval run react
```

What it does:

- Resolves the skill from the local repo first:
  - `skills/<skill>/...` when you are editing the source skill in a repo like Vasir
  - `.agents/skills/<skill>/...` when you are evaluating an installed project-local skill
  - falls back to the global catalog copy if neither local path exists
- Loads the built-in suite that lives beside that resolved skill source:
  - `skills/<skill>/evals/suite.json`
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
vasir eval run react

# repo-local wrapper with the same built-in defaults
npm run eval react

# inspect the latest saved react eval
vasir eval inspect react

# rescore the latest saved react eval with the current scorer
vasir eval rescore react

# repo-local zero-cost smoke test without the npm -- delimiter
npm run eval react mock

# only OpenAI gpt-5.4
vasir eval run react --model openai

# zero-cost local smoke test
vasir eval run react --model mock

# explicit multi-model override
vasir eval run react --model openai:gpt-5.4 --model anthropic:claude-opus-4-6
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
- `npm run eval` prints setup, launches the batch in parallel, streams completions, and accepts positional model shorthands like `npm run eval react mock` or `npm run eval react openai`.
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
vasir add react --replace
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
  "installedSkills": ["react"],
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
  "skillName": "react",
  "suiteId": "react-core",
  "suiteHash": "4d5e6f...",
  "runStatus": "complete",
  "trialCount": 3,
  "scorerVersion": 4,
  "modelIds": ["mock:skill-aware"],
  "outputDirectory": "/repo/.agents/vasir-evals/react/2026-03-18T12-00-00-000Z__abc123def456",
  "summary": {
    "rowCounts": {
      "planned": 12,
      "scored": 12,
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
  "message": "Project skill cannot be safely replaced because Vasir has no install snapshot for /repo/.agents/skills/react.",
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
`.agents/vasir-install-state.json` is Vasir's local snapshot of which files it last installed for each project-local skill. Vasir uses it to make `add --replace` fail closed on edited copies, and now prunes entries automatically when the matching skill directory is gone.

## Advanced Override

`VASIR_REPOSITORY_URL` is a troubleshooting override for local testing or mirror scenarios.

```bash
VASIR_REPOSITORY_URL=file:///absolute/path/to/vasir-fixture-repo vasir init
```

Normal installs should not set it.

## Related Pages

- [README.md](../README.md)
- [docs/troubleshooting.md](./troubleshooting.md)
- [docs/create-your-first-skill.md](./create-your-first-skill.md)
