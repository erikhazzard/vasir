# Troubleshooting Vasir

Use this page when a `vasir` command fails, an alias points at the wrong place, or a project-local skill refuses to refresh.

Every structured CLI error includes a `docsRef` URL that points back to one of the sections on this page or to the CLI reference.

## Node Prerequisites

Use this section for:

- Node runtime or launch failures before Vasir can run normally

Recommended path:

1. Confirm Node is installed and recent enough for this repo.
2. Confirm `node --version` succeeds on your shell `PATH`.
3. Rerun the same `vasir` command.

Verification:

- `node --version` prints a version instead of an error.
- `vasir --version` now runs successfully.

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
- `ALL_SKILLS_REQUEST_CONFLICT`

Recommended path:

1. Run `vasir list` to inspect the current catalog.
2. Copy the skill name exactly as listed.
3. Pass each requested skill once.
4. Use `vasir add all` by itself when you want the full catalog.

Verification:

- `vasir add <skill>`, `vasir add all`, or `vasir remove <skill>` succeeds with a listed or installed skill name.

## Remove and Local State

Use this section when:

- `vasir remove <skill>` did not remove what you expected
- `.agents/vasir-install-state.json` looks stale after manual edits

Recommended path:

1. Prefer `vasir remove <skill>` over manual deletion when you want to remove a project-local skill.
2. If you already deleted `.agents/skills/<skill>` manually, rerun `vasir remove <skill>` once to let Vasir report it as already absent and keep the local snapshot clean.
3. Inspect `.agents/skills/` as the canonical directory. Do not delete from `.claude/skills` or `.codex/skills`; those are aliases.
4. Update `AGENTS.md` yourself if it still routes to a removed skill.

Verification:

- `.agents/skills/<skill>` is gone.
- `.claude/skills` and `.codex/skills` still resolve to `.agents/skills`.
- `.agents/vasir-install-state.json` no longer contains the removed skill entry.

## Global Catalog Problems

Use this section for:

- `CATALOG_SOURCE_UNSUPPORTED`
- `INVALID_GLOBAL_CATALOG`
- `GLOBAL_CATALOG_DIRTY`

Recommended path:

1. Inspect `~/.agents/vasir`.
2. If you intentionally edited that cache, either clean it or move it aside.
3. If you set `VASIR_REPOSITORY_URL`, confirm it points at a local directory or `file:///...` URL with `registry.json`, `skills/`, and `templates/`.
4. If the cache is broken or incomplete, delete or rename it.
5. Rerun `vasir init`.

Verification:

- `~/.agents/vasir/registry.json` exists and is parseable.
- `~/.agents/vasir/skills/` exists.
- `~/.agents/vasir/templates/` exists.
- `vasir update` succeeds without a dirty-catalog error.

If you expected a repo-local skill refresh too, rerun `vasir update` from inside the target repo root or pass `--repo-root <path>`. The command only refreshes project-local skills that Vasir already manages in that repo.

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

## AGENTS Workflow Errors

Use this section for:

- `AGENTS_PROFILE_FLAG_VALUE_REQUIRED`
- `AGENTS_PROFILE_REQUIRED`
- `AGENTS_PROFILE_UNKNOWN`
- `AGENTS_FILE_EXISTS`
- `AGENTS_FILE_MISSING`
- `AGENTS_PURPOSE_PLACEHOLDER_MISSING`
- `AGENTS_PURPOSE_ALREADY_EDITED`
- `AGENTS_ROUTING_PLACEHOLDER_MISSING`
- `AGENTS_VALIDATION_FAILED`

Recommended path:

1. Start from the pit-of-success command: `vasir add <skill>`.
2. If Vasir inferred the wrong starter, rerun with `--agents-profile backend`, `--agents-profile frontend`, or `--agents-profile ios`.
3. If `AGENTS.md` already exists and you want to keep it, do not rerun a write command with `--replace`.
4. If you explicitly want to refresh the starter, rerun `vasir agents init <profile> --replace`.
5. Use `vasir agents draft-purpose --write --model openai` for the opening paragraph and `vasir agents draft-routing --write` for Section 1.
6. When validation fails on scoped lanes, either create the referenced local `AGENTS.md` files or collapse those rules back into the root file.
7. Finish with `vasir agents validate`.

Verification:

- `AGENTS.md` exists at the repo root.
- The file no longer contains scaffold text like `EDIT THESE FIRST`, `[Project Name]`, or `[Example]`.
- Any routed directory in Section 1 exists and owns a local `AGENTS.md`, or that route has been removed.

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
- `EVAL_PROVIDER_TIMEOUT`
- `EVAL_FETCH_UNAVAILABLE`
- `EVAL_CANCELLED`

Recommended path:

1. Start with the intended pit-of-success command: `vasir eval run <skill>`.
2. Confirm the skill exists locally under `skills/<skill>` or `.agents/skills/<skill>`, or exists in the global catalog.
3. Confirm the skill owns a built-in suite at `skills/<skill>/evals/suite.json` or `.agents/skills/<skill>/evals/suite.json`.
4. Decide whether you want the default live models or an explicit override:
   - default run: `vasir eval run <skill>`
   - zero-cost smoke test: `vasir eval run <skill> --model mock`
   - explicit live override: `vasir eval run <skill> --model openai` or `--model opus`
   - faster single-sample run: `vasir eval run <skill> --trials 1`
5. If using live providers, prefer a repo-local `keys.json` copied from [keys.json.example](../keys.json.example), or confirm the matching provider credentials are set in the environment:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
6. If the terminal is interactive, rerun without `--json` and let Vasir prompt you to paste or skip a missing provider key.
7. If the report says `INCOMPLETE`, run `vasir eval inspect <skill> [run-id]` and inspect the saved `run.json` under `.agents/vasir-evals/<skill>/...`.
8. If the report says `hard checks only`, that means the suite is intentionally rules-only. If the suite defines `judgePrompt` and the fixed judges were unavailable, the hard-check section still renders but the top-line verdict should fail closed to `NO SIGNAL` unless the hard floor regressed. Rerun with both OpenAI and Anthropic credentials available if you need the full suite verdict.
9. Run `vasir eval inspect <skill>` to reopen the latest saved run and see the exact baseline/treatment outputs and judge reasons that moved the score.
10. If you changed the scorer logic, run `vasir eval rescore <skill>` before trusting an older saved summary.
11. If token totals show as unavailable, confirm you are running a live provider. `--model mock` does not report provider usage.
12. Rerun the eval and inspect the printed results directory under `.agents/vasir-evals/` if a partial run was written.

Verification:

- `vasir eval run <skill>` exits successfully.
- The command prints a results path under `.agents/vasir-evals/<skill>/...`.
- That directory contains `run.json`.

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
