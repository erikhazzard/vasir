# Vasir

> Collected wisdom for AI-assisted development.

Vasir is a curated library of skill files: dense markdown control surfaces that push LLM output away from the statistical mode of public code and toward specific architectural choices.

The product is the markdown itself. The CLI exists to make the correct `.agents` / `.claude` / `.codex` filesystem shape boring and repeatable.

## Quick Start

Vasir is not published on npm yet. Install it directly from GitHub for now:

```bash
npm install -g git+https://github.com/erikhazzard/vasir.git
vasir --version
vasir add react
```

Prerequisites:

- Node 18.17+
- Git on `PATH`

Verify first success:

1. `vasir --version` prints the installed CLI version.
2. `vasir add react` prints `Project skills ready at .../.agents/skills`.
3. That directory contains `react/SKILL.md`.
4. Open the generated `AGENTS.md` in your repo root, or start from the filled example in [docs/example-agents.md](./docs/example-agents.md).

Vasir resolves the project root as the nearest parent containing `.git`. If there is no `.git` ancestor, it uses the current working directory.

Repo-local eval workflow:

- `npm run eval react`
- `npm run eval react mock` for a zero-cost local smoke test
- `npm run eval` to pick a skill interactively when needed
- Copy [keys.json.example](./keys.json.example) to `keys.json` to keep OpenAI/Anthropic keys out of the prompt flow
- Built-in eval contracts now live beside the skill at `skills/<name>/evals/`

The repo-local wrapper prints setup, uses an animated live spinner/progress row on TTYs, launches the full eval batch in parallel, and ends with a scoreboard for `Vs No Skill` and `Vs Previous Version`.

If the command fails, start with [docs/troubleshooting.md](./docs/troubleshooting.md).

## Documentation Map

- Need commands, flags, JSON envelopes, or filesystem facts? See [docs/cli-reference.md](./docs/cli-reference.md).
- Need recovery steps for an error or failed install? See [docs/troubleshooting.md](./docs/troubleshooting.md).
- Need to measure whether a skill change actually improved steering? Start with `vasir eval run <skill>`. It defaults to `openai:gpt-5.4` and `anthropic:claude-opus-4-6`, and `--model mock` gives you a zero-cost local smoke test. See [docs/cli-reference.md](./docs/cli-reference.md#eval).
- Want to build your first skill end-to-end? See [docs/create-your-first-skill.md](./docs/create-your-first-skill.md).
- Need the authoring workflow for new or revised skills? See [docs/writing-skills.md](./docs/writing-skills.md).
- Need field-level metadata and layout facts? See [docs/skill-reference.md](./docs/skill-reference.md).
- Need a filled `AGENTS.md` example? See [docs/example-agents.md](./docs/example-agents.md).
- Want the conceptual why? Read [MANIFESTO.md](./MANIFESTO.md).

## Catalog

Browse [skills/](./skills/) directly or inspect [registry.json](./registry.json). `registry.json` is the machine-readable catalog for both humans and agents.

## Registry Build

```bash
npm run build:registry
```

`registry.json` is generated from per-skill `meta.json` files. The same metadata powers CLI install, human browsing, agent discovery, and repo validation.
