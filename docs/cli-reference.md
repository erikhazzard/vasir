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

`--json` is supported by `init`, `update`, `list`, and `add`.

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
