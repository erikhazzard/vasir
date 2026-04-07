# Vasir

> Collected wisdom for AI-assisted development.

Vasir is a curated library of skill files: dense markdown control surfaces that push LLM output away from the statistical mode of public code and toward specific architectural choices.

The product is the markdown itself. The CLI exists to make the correct `.agents` / `.claude` / `.codex` filesystem shape boring and repeatable.

## Quick Start

Vasir is not published on npm yet. Install it directly from GitHub for now, and pin a tag or commit in production:

```bash
npm install -g git+https://github.com/erikhazzard/vasir.git#<tag-or-sha>
vasir --version
vasir add react
# or copy the full catalog into this repo
vasir add all
```

Prerequisites:

- Node 18.17+

Verify first success:

1. `vasir --version` prints the installed CLI version.
2. `vasir add react` prints `Project skills ready at .../.agents/skills`.
3. That directory contains `react/SKILL.md`.
4. The same command also seeds `AGENTS.md` in your repo root, inferring a stronger profile when the repo shape is obvious.
5. Optional: run `vasir agents draft-purpose --write --model openai`, `vasir agents draft-routing --write`, then `vasir agents validate`.

`vasir add all` installs every catalog skill into the current repo when you want the full bundle instead of picking individual skills.

Remove a project-local skill:

```bash
vasir remove react
```

Vasir resolves the project root as the nearest parent containing `.git`. If there is no `.git` ancestor, it uses the current working directory. Pass `--repo-root <path>` when you want to target an explicit subproject root instead, including monorepo packages.

The installed CLI now carries its own bundled catalog. Normal `vasir init`, `list`, `add`, and `update` flows do not need Git or a live upstream catalog after installation.

To keep another repo up to date after upgrading Vasir itself, install the newer CLI version first, then run:

```bash
vasir update --dry-run
vasir update
```

Add `--repo-root <path>` when the target is a nested package or subproject. `vasir update` refreshes the global cache under `~/.agents/vasir`, then refreshes the Vasir-managed skills already installed in the targeted repo.

`VASIR_REPOSITORY_URL` is now a local testing override only. Use it only with a local directory path or `file:///...` URL that already contains `registry.json`, `skills/`, and `templates/`.

Repo-local eval workflow:

- `npm run eval react`
- `npm run eval react mock` for a zero-cost local smoke test
- `npm run eval inspect react` to reopen the latest saved run for a skill
- `npm run eval rescore react` to recompute a saved run with the current scorer
- `npm run eval` to pick a skill interactively when needed
- Copy [keys.json.example](./keys.json.example) to `keys.json` to keep OpenAI/Anthropic keys out of the prompt flow
- Built-in eval contracts now live beside the skill at `skills/<name>/evals/`

`vasir eval run <skill>` now defaults to 3 trials per model/case pair, uses bounded concurrency, keeps partial results when a provider row fails, and ends with a scoreboard that names the actual evidence source for the suite. Built-in eval suites use one contract: every case must define a hard-check floor, with optional `judgePrompt` layered on top for the fixed OpenAI + Anthropic judge pass. If the judge layer is unavailable, the run still reports the hard-floor movement, but the top-line verdict fails closed to `NO SIGNAL` unless the hard floor itself regressed. `inspect` and `rescore` operate on the saved artifacts under `.agents/vasir-evals/`, with `run.json` as the combined artifact.

If the command fails, start with [docs/troubleshooting.md](./docs/troubleshooting.md).

## Documentation Map

- Need commands, flags, JSON envelopes, or filesystem facts? See [docs/cli-reference.md](./docs/cli-reference.md).
- Need recovery steps for an error or failed install? See [docs/troubleshooting.md](./docs/troubleshooting.md).
- Need the fastest AGENTS scaffold flow? Run `vasir add <skill>` or `vasir add <skill> --agents-profile <backend|frontend|ios>` when you want to force the starter, then see [templates/agents/README.md](./templates/agents/README.md).
- Need to measure whether a skill change actually improved steering? Start with `vasir eval run <skill>`. It defaults to `openai:gpt-5.4`, `anthropic:claude-opus-4-6`, and `3` trials per pair, supports optional `judgePrompt` on top of a required hard floor, and still supports `--model mock` for a zero-cost local smoke test. Use `vasir eval inspect <skill>` to inspect the latest saved run or `vasir eval rescore <skill>` after scorer changes. See [docs/cli-reference.md](./docs/cli-reference.md#eval).
- Want to build your first skill end-to-end? See [docs/create-your-first-skill.md](./docs/create-your-first-skill.md).
- Need the authoring workflow for new or revised skills? See [docs/writing-skills.md](./docs/writing-skills.md).
- Need field-level metadata and layout facts? See [docs/skill-reference.md](./docs/skill-reference.md).
- Need the fastest AGENTS template starting point? See [templates/agents/README.md](./templates/agents/README.md).
- Need a filled `AGENTS.md` example? See [docs/example-agents.md](./docs/example-agents.md).
- Want the conceptual why? Read [MANIFESTO.md](./MANIFESTO.md).

## Catalog

Browse [skills/](./skills/) directly or inspect [registry.json](./registry.json). `registry.json` is the machine-readable catalog for both humans and agents.

## Registry Build

```bash
npm run build:registry
```

`registry.json` is generated from each skill directory, with `SKILL.md` as the primary source and optional `meta.json` as a compatibility fallback. The same catalog powers CLI install, human browsing, agent discovery, and repo validation.
