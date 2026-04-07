# Vasir Work Context

> Canonical implementation contract for the `.agents` install model and the `vasir` CLI.

## 1. Identity

- Product name: `Vasir`
- Git repository: `vasir`
- Published npm package: not published yet
- Current install path: `npm install -g git+https://github.com/erikhazzard/vasir.git`
- License: `MIT`
- One-liner: `A collection of skill files for conditioning LLMs away from the mode.`

## 2. Core Product Thesis

1. The product is markdown.
   - Skills are the product. Tooling exists to make correct installation and discovery boring.
2. Skills are copied into projects.
   - Project-local skills are user-owned files under version control.
   - They are not live-linked to a global catalog.
3. `.agents` is the canonical filesystem contract.
   - `.claude` and `.codex` exist as compatibility views onto the same repo-local or home-local source of truth.
4. `registry.json` is the machine-readable catalog.
   - Humans browse it indirectly.
   - Agents and tooling consume it directly.
5. One clear path.
   - Canonical global source: `~/.agents/vasir`
   - Canonical project source: `<repo>/.agents/skills/<skill>`
   - Project root means the nearest parent containing `.git`; if none exists, the current working directory is treated as the project root.

## 3. User Journey Unlock

The player just bootstrapped a repo, expects Claude and Codex to see the same steering immediately, and will next ask either tool to act on those skills. This implementation bridges bootstrap -> cross-agent consistency by making `.agents/skills` canonical and projecting `.claude/skills` and `.codex/skills` onto that same directory.

### Magic Moment

The visceral payoff happens when the user adds a skill once, opens either Claude or Codex, and both tools already resolve the exact same file without the user thinking about which hidden folder the tool expects.

## 4. Canonical Filesystem Contract

### 4.1 Global Catalog

The CLI maintains a tool-owned global clone:

```text
~/.agents/
  vasir/                 # canonical global clone
~/.claude/
  vasir -> ~/.agents/vasir
~/.codex/
  vasir -> ~/.agents/vasir
```

Rules:

- `~/.agents/vasir` is the only mutable global source of truth.
- `~/.claude/vasir` and `~/.codex/vasir` must be links to that directory, never copies.
- `init` and `update` may mutate only the canonical global clone plus compatibility aliases.
- If the global clone is dirty, `update` fails closed.

### 4.2 Project Install

The CLI installs selected skills into the current repo:

```text
my-project/
  AGENTS.md
  .agents/
    skills/
      react/
        SKILL.md
      netcode/
        SKILL.md
  .claude/
    skills -> .agents/skills
  .codex/
    skills -> .agents/skills
```

Rules:

- Project-local skills are real copied directories under `.agents/skills`.
- Vasir records a managed install snapshot at `<repo>/.agents/vasir-install-state.json` so it can detect local divergence before a refresh.
- `.claude/skills` and `.codex/skills` must be links to `.agents/skills`, never copies.
- `add` never overwrites an existing project skill directory.
- `update` never mutates project-local skills.
- The template `AGENTS.md` should reference `.agents/skills/<skill>/SKILL.md` as the canonical route.

## 5. Cross-Platform Link Contract

1. Never commit symlinks or junctions to git as part of Vasir distribution.
2. Create links locally at install time.
3. Preferred behavior:
   - POSIX: create relative directory symlinks.
   - Windows: attempt a directory symlink first; if unavailable, create a directory junction.
4. Alias creation must verify the resulting target with `realpath`.
5. If link creation cannot produce a true alias, fail closed with a clear error.
6. Re-running `init` or `add` must repair broken aliases.

## 6. CLI Contract

The canonical CLI surface is the installed `vasir` command:

```text
vasir <command>
```

The zero-install wrapper may use `npx vasir <command>`, but docs and help should teach the bare command first.

CLI rules:

- Git must be available on `PATH` before any command that touches the global catalog.
- `--help` prints the canonical contract with bare `vasir` commands.
- `--version` prints the installed CLI name and version and is safe to run before any other command.
- `--json` emits stable machine-readable envelopes for `init`, `update`, `list`, and `add`.
- Errors must expose a stable `code`, a human-readable `message`, a concrete recovery `suggestion`, and a `docsRef` URL back into the public docs.
- The public command surface stays minimal: `init`, `update`, `list`, and `add`.
- `--replace` is the explicit overwrite path for refreshing an existing project-local skill copy.
- `--replace` must fail closed if the existing project-local skill has local edits, unexpected files, or no tracked Vasir install snapshot.
- `VASIR_REPOSITORY_URL` is a troubleshooting override for redirecting the global clone source during local testing or mirror scenarios. Defaults must not depend on it.

### 6.1 `init`

Behavior:

- Clone the Vasir repository into `~/.agents/vasir` if missing.
- If already present and clean, fast-forward it.
- Create or repair `~/.claude/vasir` and `~/.codex/vasir`.
- Exit non-zero if the existing global clone is dirty or invalid.
- Fail with a specific Git preflight error if Git is unavailable.
- Support `--json` with the global catalog path.

### 6.2 `update`

Behavior:

- If the global clone is missing, behave like `init`.
- Fast-forward `~/.agents/vasir`.
- Repair global aliases after update.
- Do not touch the current project.
- Support `--json` with the global catalog path.

### 6.3 `list`

Behavior:

- Auto-run `init` if the global clone is missing.
- Read `registry.json` from `~/.agents/vasir`.
- Print skills grouped by category with concise descriptions.
- Support `--json` with the full skill list and global catalog path.

### 6.4 `add <skill> [skill...]`

Behavior:

- Auto-run `init` if the global clone is missing.
- Validate requested skills against the global `registry.json`.
- Resolve the current repo root as the nearest parent containing `.git`; if no `.git` ancestor exists, use the current working directory.
- Create or repair project-local `.agents/skills`, `.claude/skills`, and `.codex/skills`.
- Copy the full checked-in skill directory contents.
- Refuse to overwrite an existing `<repo>/.agents/skills/<skill>` directory unless `--replace` is explicitly provided.
- If root `AGENTS.md` is missing, copy the template into place.
- Support `--json` with the installed skill names, replaced skill names, the resolved project root path, and the project skills path.
- `--replace` refreshes an existing project-local skill copy from the global catalog only when the local directory still matches the last Vasir-managed snapshot.
- If the project-local skill has local edits, unexpected files, or missing tracked state, `--replace` must fail closed and instruct the user to back up/delete manually.

## 7. Repo Structure

```text
vasir/
  README.md
  MANIFESTO.md
  LICENSE
  registry.json
  package.json
  bin/
    vasir.js
  cli/
    command-runner.js
    global-catalog.js
    link-directory.js
    path-layout.js
    project-install-state.js
    project-skills.js
    skill-metadata.js
    eval/
      run-skill-eval.js
      suite-source.js
      evidence.js
    ui/
      command-output.js
      live-progress.js
  registry/
    build.js
  skills/
    <skill>/
      SKILL.md
      meta.json?            # optional compatibility metadata only
      references/...
  templates/
    AGENTS.md
    SKILL.md
  docs/
    cli-reference.md
    create-your-first-skill.md
    example-agents.md
    skill-reference.md
    troubleshooting.md
    writing-skills.md
  work/
    WORK.md
  test/
    cli-install-flow.test.js
    registry-build.test.js
    repository-layout.test.js
```

Rules:

- No generic `scripts/` bucket for active product logic.
- `bin/` is the public command boundary only.
- `cli/` owns the shipped runtime code for install, remove, eval, prompts, and terminal UI.
- `registry/` owns catalog generation.

## 8. Package Contract

`package.json` must declare:

- `name: "vasir"`
- `license: "MIT"`
- `type: "module"`
- `bin: { "vasir": "./bin/vasir.js" }`
- publishable metadata (`description`, `repository`, `keywords`, `files`)
- scripts:
  - `build:registry`
  - `check:registry`
  - `test`

Constraints:

- Zero runtime dependencies.
- Node builtins only.
- Use `os.homedir()`, not `process.env.HOME`.
- Use spawned argv arrays, not shell-quoted command strings.

## 9. Metadata Contract

Each skill directory contains:

- `SKILL.md`
- optional `meta.json`
- optional `references/`

`SKILL.md` is the primary source of truth. `registry.json` is generated from the skill directory and inferred file inventory. `meta.json` is an optional compatibility fallback.

Primary catalog fields:

- `name`
- `version`
- `description`
- `category`
- `tags`
- `recommends`
- `files`

`files[]` is inferred from the checked-in file inventory; authors do not maintain it manually.

## 10. Testing Contract

Every behavior change in the CLI must ship with deterministic integration coverage.

Required test surfaces:

1. `cli install flow`
   - `init` creates the global clone and global aliases.
   - `update` bootstraps the global clone when it is missing.
   - `update` rejects a dirty global clone.
   - `list` reads the catalog from the canonical global clone.
   - `add` copies the requested skill into `.agents/skills` and repairs `.claude/skills` and `.codex/skills`.
   - `add --replace` refreshes an existing project-local skill from the global catalog.
   - `add --replace` fails closed when the project-local skill has local divergence from the last Vasir-managed snapshot.
   - `--json` success and error envelopes stay stable.
   - the packaged binary can execute the documented `add` journey against a local fixture clone source.
2. `repository layout`
   - every skill lives at `skills/<name>/SKILL.md`
   - any optional `meta.json` lives at `skills/<name>/meta.json`
   - generated file inventories match disk
   - local markdown links resolve
   - skill count is dynamic, never hardcoded
3. `registry build`
   - the generated registry matches `registry.json`

Anti-flake rules:

- no network
- no sleeps for correctness
- temp directories only
- local fixture repos only
- bounded child-process waits

## 11. Documentation Contract

The repo docs must tell one coherent story:

- `README.md` is a landing page with the shortest-path quickstart, first-success verification, and links to companion pages.
- `README.md` uses the GitHub install string until a real npm publish exists.
- `docs/cli-reference.md` owns commands, flags, version output, JSON envelopes, filesystem facts, and the `VASIR_REPOSITORY_URL` override.
- `docs/troubleshooting.md` owns error-code and failure-recovery guidance.
- `docs/create-your-first-skill.md` is the end-to-end tutorial for a first contribution.
- `docs/writing-skills.md` is the authoring how-to.
- `docs/skill-reference.md` owns file layout, metadata, and versioning facts.
- `templates/agents/README.md` is the single "start here" page for AGENTS templates and profile selection.
- `docs/example-agents.md` provides a filled `AGENTS.md` example alongside the blank template.
- `README.md` routes readers to the companion pages for repo-root resolution, CLI details, and troubleshooting.
- `templates/agents/AGENTS.md` is the canonical blank root manifest template.
- `docs/writing-skills.md` keeps the flat `skills/<name>` authoring contract.

## 12. Implementation Sequence

1. Lock this spec.
2. Replace the old manual-only story in the README and templates.
3. Implement the publishable CLI.
4. Move registry generation into `registry/build.js`.
5. Add deterministic CLI integration tests.
6. Regenerate `registry.json`.
7. Run the full verification suite.
