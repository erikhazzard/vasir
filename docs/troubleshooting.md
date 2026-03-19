# Troubleshooting Vasir

Use this page when a `vasir` command fails, an alias points at the wrong place, or a project-local skill refuses to refresh.

Every structured CLI error includes a `docsRef` URL that points back to one of the sections on this page or to the CLI reference.

## Git and Node Prerequisites

Use this section for:

- `GIT_NOT_FOUND`
- `GIT_UNAVAILABLE`

Recommended path:

1. Confirm Node is installed and recent enough for this repo.
2. Confirm Git is installed and `git --version` succeeds on your shell `PATH`.
3. Rerun the same `vasir` command.

Verification:

- `git --version` prints a version instead of an error.
- `vasir init` or `vasir list` now runs without a Git preflight error.

## Unknown Command or Flag

Use this section for:

- `UNKNOWN_COMMAND`
- `UNKNOWN_FLAG`
- `INVALID_COMMAND_FLAG`

Recommended path:

1. Run `vasir --help`.
2. Compare your command against the supported surface in [docs/cli-reference.md](./cli-reference.md#commands).
3. If you meant to refresh an existing project-local skill, use `vasir add <skill> --replace`.

Verification:

- The retried command matches one of the supported forms in the CLI reference.

## Skill Request Errors

Use this section for:

- `SKILL_NAME_REQUIRED`
- `UNKNOWN_SKILL`
- `DUPLICATE_SKILL_REQUEST`

Recommended path:

1. Run `vasir list` to inspect the current catalog.
2. Copy the skill name exactly as listed.
3. Pass each requested skill once.

Verification:

- `vasir add <skill>` succeeds with a listed skill name.

## Global Catalog Problems

Use this section for:

- `GIT_COMMAND_FAILED`
- `INVALID_GLOBAL_CATALOG`
- `GLOBAL_CATALOG_DIRTY`

Recommended path:

1. Inspect `~/.agents/vasir`.
2. If you intentionally edited that clone, either clean it or move it aside.
3. If the clone is broken or incomplete, delete or rename it.
4. Rerun `vasir init`.

Verification:

- `~/.agents/vasir/.git` exists.
- `~/.agents/vasir/registry.json` exists and is parseable.
- `vasir update` succeeds without a dirty-catalog error.

## Replace Safety Errors

Use this section for:

- `PROJECT_SKILL_EXISTS`
- `PROJECT_SKILL_UNTRACKED`
- `PROJECT_SKILL_MODIFIED`
- `INVALID_PROJECT_INSTALL_STATE`

Recommended path:

1. Decide whether you want to keep the current project-local skill directory.
2. If you want to preserve local edits, back them up first.
3. If you want a fresh Vasir-managed copy, delete the project-local skill directory manually.
4. If `.agents/vasir-install-state.json` is invalid and you no longer trust it, delete that file too.
5. Rerun `vasir add <skill>` for a fresh install, or `vasir add <skill> --replace` only after the directory matches the last Vasir-managed snapshot.

Verification:

- The project-local skill directory contains only the files Vasir manages for that skill.
- `.agents/vasir-install-state.json` is valid JSON if it exists.
- `vasir add <skill> --replace` succeeds only when no local divergence remains.

## Alias Problems

Use this section for:

- `ALIAS_TARGET_MISSING`
- `ALIAS_CONFLICT`
- `ALIAS_REPAIR_FAILED`

Recommended path:

1. Inspect the conflicting alias path under `.claude`, `.codex`, or your home directory.
2. Move or delete the conflicting path if it is not meant to be the Vasir-managed alias.
3. Rerun `vasir init` for global aliases or `vasir add <skill>` for project-local aliases.

Verification:

- The alias resolves to the canonical `.agents` target.
- `realpath` on the alias path matches the target path.

## Eval Errors

Use this section for:

- `EVAL_SUBCOMMAND_REQUIRED`
- `UNKNOWN_EVAL_SUBCOMMAND`
- `EVAL_SKILL_REQUIRED`
- `EVAL_SKILL_NOT_FOUND`
- `EVAL_SUITE_NOT_FOUND`
- `EVAL_SUITE_INVALID`
- `EVAL_SKILL_INVALID`
- `EVAL_MODELS_NOT_CONFIGURED`
- `EVAL_MODEL_DESCRIPTOR_INVALID`
- `EVAL_KEYS_INVALID`
- `MODEL_FLAG_VALUE_REQUIRED`
- `EVAL_PROVIDER_NOT_SUPPORTED`
- `EVAL_PROVIDER_AUTH_MISSING`
- `EVAL_PROVIDER_FAILED`
- `EVAL_FETCH_UNAVAILABLE`
- `EVAL_CANCELLED`

Recommended path:

1. Start with the intended pit-of-success command: `vasir eval run <skill>`.
2. Confirm the skill exists locally under `skills/<skill>` or `.agents/skills/<skill>`, or exists in the global catalog.
3. Confirm the skill has a built-in suite at `evals/suites/<skill>/suite.json`.
4. Decide whether you want the default live models or an explicit override:
   - default run: `vasir eval run <skill>`
   - zero-cost smoke test: `vasir eval run <skill> --model mock`
   - explicit live override: `vasir eval run <skill> --model openai` or `--model opus`
5. If using live providers, prefer a repo-local `keys.json` copied from [keys.json.example](../keys.json.example), or confirm the matching provider credentials are set in the environment:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
6. If the terminal is interactive, rerun without `--json` and let Vasir prompt you to paste or skip a missing provider key.
7. Rerun the eval and inspect the printed results directory under `.agents/vasir-evals/` if a partial run was written.

Verification:

- `vasir eval run <skill>` exits successfully.
- The command prints a results path under `.agents/vasir-evals/<skill>/...`.
- That directory contains `summary.json` and `rows.json`.

## Unexpected Errors

Use this section for:

- `UNEXPECTED_ERROR`

Recommended path:

1. Read the exact error text and the `suggestion` field.
2. Confirm whether the failure is environmental, such as an unexpected filesystem permission or shell setup issue.
3. Retry after fixing the local condition.
4. If the same failure reproduces, capture the command, full error, and your local directory layout before investigating the implementation.

Verification:

- The same command succeeds after the local issue is removed.

## Related Pages

- [README.md](../README.md)
- [docs/cli-reference.md](./cli-reference.md)
