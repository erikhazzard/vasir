# Vasir

> Collected wisdom for AI-assisted development.

Vasir is a curated library of skill files: dense markdown control surfaces that push LLM output away from the statistical mode of public code and toward specific architectural choices.

The product is the markdown itself. The CLI exists to make the correct `.agents` / `.claude` / `.codex` filesystem shape boring and repeatable.

## What Vasir Adds To A Repo

Vasir adds two things to the repo you care about:

1. `AGENTS.md`
   This is the repo-specific spine. It tells the AI what this repo is, what matters here, how to route work, and what "good" means in this codebase.
2. `.agents/skills/`
   These are the reusable specialist playbooks. Each skill helps with a specific class of work like bug fixing, testing, frontend work, audits, or game systems.

The power is in the combination:

- `AGENTS.md` gives the AI repo-specific behavior.
- `skills` give the AI reusable specialist depth.
- Vasir makes sure both show up in the repo in a clean, updateable shape.

If you are new to AI or agents, the simplest mental model is:

- `AGENTS.md` is the repo's operating manual for AI.
- `.agents/skills/` is the repo's library of specialist playbooks.
- `vasir init` puts both into the repo.

## Quick Start

Vasir is not published on npm yet. Install it directly from GitHub for now, and pin a tag or commit in production:

```bash
npm install -g git+https://github.com/erikhazzard/vasir.git#<tag-or-sha>
vasir --version
# inspect-first, zero-risk:
vasir
# LLM/repo handshake, still zero-risk and local-only:
vasir context --json
# extra local timing and routing evidence when you need it:
vasir context --json --debug
# inside a repo:
vasir init
```

Prerequisites:

- Node 18.17+

If you just want to use this in an existing repo, the beginner path is:

```bash
cd /path/to/your-repo
vasir init
```

That will:

- install the full Vasir skill catalog into `.agents/skills/`
- create `.agents/vasir.json` so the repo can stay in sync later
- create `.agents/vasir-install-state.json` for safe updates
- seed `AGENTS.md` if it does not already exist

Then:

1. open `AGENTS.md`
2. replace the placeholder purpose/routing text with repo truth
3. commit `AGENTS.md` and `.agents/`

Verify first success:

1. `vasir --version` prints the installed CLI version.
2. `vasir` or `vasir status` prints the current global and repo-local Vasir state without mutating files.
3. `vasir context --json` prints a machine-readable repo handshake without any model call, token usage, or network access.
4. `vasir context --json --debug` prints the same handshake plus timing and routing evidence.
5. `vasir init` inside a repo prints `Repo initialized`.
6. `.agents/skills/` now exists in that repo and contains the full Vasir catalog.
7. `.agents/vasir.json` now exists in that repo and records the repo's explicit Vasir tracking policy.
8. The same command also seeds `AGENTS.md` in your repo root, inferring a stronger profile when the repo shape is obvious.
9. Optional: run `vasir agents draft-purpose --write --model openai`, `vasir agents draft-routing --write`, then `vasir agents validate`.

`vasir init` is now the obvious repo path: inside a repo it installs the full catalog and marks that repo to keep tracking the full catalog on future `vasir update` runs.

Important distinction:

- `AGENTS.md` is not just a blank template. The value is the repo-specific version you end up with after editing it.
- the skills are not repo-specific by default. They are reusable specialist playbooks copied into the repo.
- Vasir works best when both are present: repo-specific `AGENTS.md` plus the right skill library.

The zero-argument path is now read-only. `vasir` defaults to `vasir status`, so the safest inspect-first command is also the shortest one.

`.agents/vasir.json` is now the repo-level source of truth for what the repo wants to track. `.agents/vasir-install-state.json` still exists, but only as Vasir's operational snapshot for replace safety and update planning.

If you want only a selected subset instead of full-catalog tracking, use:

```bash
vasir add design__building-frontend
```

Remove a project-local skill:

```bash
vasir remove design__building-frontend
```

If a repo already has `.agents/skills/` from an older workflow and you want to start managing that tree without copying files again, use:

```bash
vasir adopt
```

When something looks off, use:

```bash
vasir doctor
vasir repair
```

Vasir resolves the project root as the nearest parent containing `.git`. If there is no `.git` ancestor, it uses the current working directory. Pass `--repo-root <path>` when you want to target an explicit subproject root instead, including monorepo packages.

The installed CLI now carries its own bundled catalog. Normal `vasir init`, `list`, `add`, and `update` flows do not need Git or a live upstream catalog after installation.

To keep another repo up to date after upgrading Vasir itself, install the newer CLI version first, then run:

```bash
vasir init         # first time in a repo
vasir update --dry-run
vasir update
```

Add `--repo-root <path>` when the target is a nested package or subproject. `vasir update` refreshes the global cache under `~/.agents/vasir`, then refreshes the skills tracked by the targeted repo. Repos initialized with `vasir init` track the full catalog, so new Vasir skills are installed automatically on later updates.

Recommended day-2 loop:

```bash
vasir
vasir context --json
vasir doctor
vasir repair   # when metadata, aliases, or missing tracked skills need recovery
vasir diff
vasir update --dry-run
vasir update
```

`vasir context --json` is the intended LLM entrypoint. It is purely local repo introspection: no model call, no hidden provider token, no network. It reads repo facts already on disk, then returns the repo root, tracked skills, relevant `AGENTS.md` files, scored recommended skills with explanation signals, and the next safe Vasir commands. Add `--debug` when you want local timing detail, routed `AGENTS.md` path hints, profile inference evidence, and the top candidate recommendation set.

`VASIR_REPOSITORY_URL` is now a local testing override only. Use it only with a local directory path or `file:///...` URL that already contains `registry.json`, `.agents/skills/`, and `templates/`.

Repo-local eval workflow:

- `npm run eval testing__enforcing-mandate`
- `npm run eval testing__enforcing-mandate mock` for a zero-cost local smoke test
- `npm run eval inspect testing__enforcing-mandate` to reopen the latest saved run for a skill
- `npm run eval rescore testing__enforcing-mandate` to recompute a saved run with the current scorer
- `npm run eval` to pick a skill interactively when needed
- Copy [keys.json.example](./keys.json.example) to `keys.json` to keep OpenAI/Anthropic keys out of the prompt flow
- Built-in eval contracts now live beside the skill at `.agents/skills/<name>/evals/`

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

Browse [.agents/skills/](./.agents/skills/) directly or inspect [registry.json](./registry.json). `registry.json` is the machine-readable catalog for both humans and agents.

## Registry Build

```bash
npm run build:registry
```

`registry.json` and `.vasir-catalog-manifest.json` are generated from the current skill tree. `SKILL.md` remains the primary source and optional `meta.json` is still a compatibility fallback. The same catalog powers CLI install, human browsing, agent discovery, repo validation, and the bundled fast-path hash used by inspect commands.
