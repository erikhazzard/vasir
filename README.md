# Vasir

Vasir gives each repo a generated agent manual, a small source file for local constraints, and a managed skill tree.

- `AGENTS__non-obvious.md` is authored. Put repo constraints, hazards, and local rules here.
- `AGENTS.md` is generated. Commit it, but regenerate it from Vasir.
- `.agents/skills/` holds copied skills. `.codex/skills` and `.claude/skills` point at the same tree.

Source rule: edit `AGENTS__non-obvious.md`, then run `vasir agents sync`.

## Install

Vasir requires Node 18.17 or newer.

```bash
npm install -g git+https://github.com/erikhazzard/vasir.git
vasir --version
```

## Start A Repo

Run setup from the repo root.

```bash
vasir init
vasir agents sync
```

`vasir init` installs the skill catalog and repo metadata:

- syncs the bundled catalog into `~/.agents/vasir`
- copies skills into `.agents/skills/`
- creates `.agents/vasir.json` and `.agents/vasir-install-state.json`
- creates `.codex/skills` and `.claude/skills` links
- seeds root `AGENTS.md` when missing

`vasir agents sync` renders the agent manual:

- infers or applies a `frontend`, `backend`, `ios`, or `generic` profile
- creates `AGENTS__non-obvious.md` when missing
- injects the sidecar into Section 4 of `AGENTS.md`
- fills purpose and routing from local repo context
- validates the generated result before writing

After that, edit the sidecar and regenerate.

```bash
$EDITOR AGENTS__non-obvious.md
vasir agents sync
```

## Root And Scoped AGENTS

Use the repo root for repo-wide rules.

```bash
vasir agents sync
vasir agents sync --profile frontend
```

Use `--scope` when a subfolder needs its own agent root. This is the monorepo path for folders like `frontend/`, `backend/`, `packages/web/`, or `services/api/`.

```bash
vasir agents sync --scope frontend --profile frontend
vasir agents sync --scope backend --profile backend
vasir agents sync --scope packages/web --profile frontend
vasir agents sync --scope services/api --profile backend
```

Scoped sync writes the sidecar and generated AGENTS file inside that folder.

```text
frontend/
  AGENTS.md
  AGENTS__non-obvious.md

backend/
  AGENTS.md
  AGENTS__non-obvious.md
```

When the folder name or contents make the stack obvious, omit `--profile`.

```bash
vasir agents sync --scope frontend
```

Use `--repo-root` when the managed Vasir project root itself changes. That affects skills, config, and install state, not only a nested AGENTS file.

```bash
vasir init --repo-root frontend
vasir update --repo-root frontend
```

## Daily Commands

Inspect without changing files.

```bash
vasir
vasir status
vasir context --json
vasir context --json --debug
```

Refresh tracked skills after upgrading the Vasir CLI.

```bash
vasir update --dry-run
vasir update
```

Preview or apply AGENTS template changes.

```bash
vasir agents sync --dry-run
vasir agents sync
```

Validate generated AGENTS files.

```bash
vasir agents validate
vasir agents validate --scope frontend
```

Repair repo-local Vasir metadata.

```bash
vasir doctor
vasir repair
```

## Skills

Install the full catalog.

```bash
vasir init
```

Install selected skills.

```bash
vasir add code__fixing-bugs
vasir add design__building-frontend-interfaces testing__enforcing-mandate
```

Remove selected skills.

```bash
vasir remove design__building-frontend-interfaces
```

Adopt an existing `.agents/skills/` tree without copying files.

```bash
vasir adopt
```

Review tracked skill changes before updating.

```bash
vasir diff
vasir diff --exit-code
```

## File Ownership

In a managed repo, edit these files directly.

```text
AGENTS__non-obvious.md
.agents/vasir.json
```

Vasir owns these files.

```text
AGENTS.md
.agents/vasir-install-state.json
```

`AGENTS.md` is safe to commit. Put durable repo constraints in `AGENTS__non-obvious.md` and rerun `vasir agents sync`.

Vasir also carries old layouts forward:

- old `.agents/non-obvious.md` sidecars move to `AGENTS__non-obvious.md`
- old manual `AGENTS.md` non-obvious blocks can seed `AGENTS__non-obvious.md`
- dirty global caches move to `~/.agents/vasir.dirty-backup.<timestamp>` during `init` or `update`, then Vasir rebuilds a clean cache from the installed bundle

In the Vasir repo itself, these generated files also change when templates, skills, or package metadata change.

```text
registry.json
.vasir-catalog-manifest.json
```

## Skill Evals

Run a built-in skill eval.

```bash
npm run eval testing__enforcing-mandate
npm run eval testing__enforcing-mandate mock
npm run eval inspect testing__enforcing-mandate
npm run eval rescore testing__enforcing-mandate
```

Provider credentials can live in repo-root `keys.json`. Start from [keys.json.example](./keys.json.example).

## Developing Vasir

Regenerate registry artifacts after changing skills, templates, docs included in the packaged catalog, or package metadata.

```bash
npm run build:registry
npm run check:registry
npm test
```

`registry.json` and `.vasir-catalog-manifest.json` are generated from `.agents/skills/`, `templates/`, selected docs, and package metadata. `SKILL.md` is the primary skill source; optional `meta.json` remains a compatibility fallback.

## Reference

- CLI details: [docs/cli-reference.md](./docs/cli-reference.md)
- Troubleshooting: [docs/troubleshooting.md](./docs/troubleshooting.md)
- AGENTS template notes: [templates/agents/README.md](./templates/agents/README.md)
- Example generated AGENTS file: [docs/example-agents.md](./docs/example-agents.md)
- Create a skill: [docs/create-your-first-skill.md](./docs/create-your-first-skill.md)
- Skill authoring reference: [docs/writing-skills.md](./docs/writing-skills.md)
- Skill metadata/layout reference: [docs/skill-reference.md](./docs/skill-reference.md)
- Manifesto: [MANIFESTO.md](./MANIFESTO.md)
