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
| `eval run` | `vasir eval run <skill> [--json] [--model <name>]` | Run the built-in baseline vs treatment eval for a skill |
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
- Loads the built-in suite for that skill.
- Runs the same case set twice for every configured model:
  - baseline: no skill
  - treatment: with the skill
- Scores the outputs with built-in hard checks.
- Stores local run history under `.agents/vasir-evals/<skill>/...`.
- Prints lift versus baseline and, when available, versus the previous recorded run for that skill.

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

Examples:

```bash
vasir eval run react

# only OpenAI gpt-5.4
vasir eval run react --model openai

# zero-cost local smoke test
vasir eval run react --model mock

# explicit multi-model override
vasir eval run react --model openai:gpt-5.4 --model anthropic:claude-opus-4-6
```

Notes:

- The current M1 implementation uses built-in hard scorers, not blind pairwise judging yet.
- If a default live provider is missing credentials and the terminal is interactive, Vasir prompts you to paste a key or skip that provider.
- In non-interactive environments, missing live-provider credentials cause those providers to be skipped. If nothing runnable remains, the command fails cleanly and points you to `--model mock`.
- Eval artifacts are tool-owned local files and are ignored by this repo via `.agents/vasir-evals/`.

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

`--json` is supported by `init`, `update`, `list`, `add`, and `eval run`.

Success envelope:

- `command`
- `status`
- `globalCatalogDirectory` for `init`, `update`, `list`, and `add`
- `skills` for `list`
- `projectRootDirectory`, `projectSkillsDirectory`, `installedSkills`, and `replacedSkills` for `add`

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
  "modelIds": ["mock:skill-aware"],
  "outputDirectory": "/repo/.agents/vasir-evals/react/2026-03-18T12-00-00-000Z__abc123def456",
  "summary": {
    "global": {
      "averageScoreLift": 0.5,
      "passRateLift": 1
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
