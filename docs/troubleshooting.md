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
3. If you wanted a read-only inspection command, use `vasir status` or `vasir doctor`.
4. If you meant to refresh an existing project-local skill, use `vasir add <skill> --replace`.

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

## Status, Doctor, and Adopt

Use this section when:

- `vasir status` says a repo needs adoption
- `vasir doctor` reports alias drift or blocked updates
- a repo already has `.agents/skills/` but `vasir update` says it is not initialized

Extra local skill directories in an already tracked repo are reported for visibility but do not require adoption. `adopt` is for a tree that lacks a valid Vasir tracking policy, not for registering catalog-unknown local skills.

Recommended path:

1. Start with `vasir status` for the high-level state.
2. Run `vasir context --json --debug` when you want the routed `AGENTS.md` paths, profile inference, and local timing evidence that Vasir is using.
3. Run `vasir doctor` when you need the detailed repair checklist.
4. Run `vasir repair` to rebuild repo metadata, repair aliases, and restore missing tracked skills.
5. Use `vasir adopt` only when you explicitly want the older narrow “snapshot the current tree without copying files” workflow.
6. Run `vasir diff` when you want the exact tracked file changes before mutating the repo.
7. After repair, run `vasir update --dry-run` before `vasir update`.

Verification:

- `vasir status` reports `Repo tracked by Vasir`.
- `.agents/vasir.json` exists and is valid JSON.
- `.agents/vasir-install-state.json` exists and is valid JSON.
- `.claude/skills` and `.codex/skills` resolve to `.agents/skills`.

## Remove and Local State

Use this section when:

- `vasir remove <skill>` did not remove what you expected
- `.agents/vasir-install-state.json` looks stale after manual edits

Recommended path:

1. Prefer `vasir remove <skill>` over manual deletion when you want to remove a project-local skill.
2. If you already deleted `.agents/skills/<skill>` manually, rerun `vasir remove <skill>` once to let Vasir report it as already absent and keep the local snapshot clean.
3. Inspect `.agents/skills/` as the canonical directory. Do not delete from `.claude/skills` or `.codex/skills`; those are aliases.
4. Update generated root contracts yourself if they still route to a removed skill.

Verification:

- `.agents/skills/<skill>` is gone.
- `.claude/skills` and `.codex/skills` still resolve to `.agents/skills`.
- `.agents/vasir.json` reflects the remaining tracked skill policy.
- `.agents/vasir-install-state.json` no longer contains the removed skill entry.

## Global Catalog Problems

Use this section for:

- `CATALOG_SOURCE_UNSUPPORTED`
- `INVALID_GLOBAL_CATALOG`
- `GLOBAL_CATALOG_DIRTY`

Recommended path:

1. Run `vasir update --dry-run` to preview whether Vasir would quarantine and rebuild the cache.
2. Run `vasir init` or `vasir update`. Vasir moves the dirty cache aside to `~/.agents/vasir.dirty-backup.<timestamp>` and rebuilds `~/.agents/vasir` from the installed bundle.
3. If you set `VASIR_REPOSITORY_URL`, confirm it points at a local directory or `file:///...` URL with `registry.json`, `.agents/skills/`, and `templates/`.

Verification:

- `~/.agents/vasir/registry.json` exists and is parseable.
- `~/.agents/vasir/.agents/skills/` exists.
- `~/.agents/vasir/templates/` exists.
- If a dirty cache existed, a sibling `~/.agents/vasir.dirty-backup.<timestamp>` directory contains the previous cache contents.
- `vasir update` succeeds.

If you expected a repo-local skill refresh too, rerun `vasir update` from inside the target repo root or pass `--repo-root <path>`.
- Repos initialized with `vasir init` or `vasir add all` track the full catalog, so `update` also installs newly added Vasir skills.
- Repos initialized with `vasir add <specific skills>` track only that selected subset.
- Run `vasir diff` first when you want to review exact tracked file changes before updating the repo.

## Replace Safety Errors

Use this section for:

- `PROJECT_SKILL_EXISTS`
- `PROJECT_SKILL_UNTRACKED`
- `PROJECT_SKILL_MODIFIED`
- `INVALID_PROJECT_INSTALL_STATE`
- `INVALID_PROJECT_CONFIG`

Recommended path:

1. Decide whether you want to keep the current project-local skill directory.
2. If you want to preserve local edits, back them up first.
3. If you want a fresh Vasir-managed copy, delete the project-local skill directory manually.
4. If `.agents/vasir-install-state.json` or `.agents/vasir.json` is invalid and you want Vasir to rebuild the repo metadata safely, run `vasir repair`.
5. If `.agents/vasir-install-state.json` or `.agents/vasir.json` is invalid and you no longer trust the current tree, delete those files too.
6. Rerun `vasir add <skill>` for a fresh install, or `vasir add <skill> --replace` only after the directory matches the last Vasir-managed snapshot.

Verification:

- The project-local skill directory contains only the files Vasir manages for that skill.
- `.agents/vasir.json` is valid JSON if it exists.
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

1. Preview with `vasir agents sync --dry-run`.
2. Run `vasir agents sync`.
3. If Vasir inferred the wrong profile, rerun with `vasir agents sync --profile backend`, `vasir agents sync --profile frontend`, `vasir agents sync --profile ios`, or `vasir agents sync --profile generic`.
4. Keep repo-specific landmines in `AGENTS__non-obvious.md`; `AGENTS.md` and `CLAUDE.md` are regenerated from it.
5. Remove generic failure-posture shorthand from `AGENTS__non-obvious.md`; name the exact rejected effect and the independent behavior that continues.
6. Use `vasir agents init`, `draft-purpose`, `draft-routing`, and `validate` only when you intentionally need the lower-level primitives.

Verification:

- `AGENTS.md` and `CLAUDE.md` exist at the repo root.
- The generated `AGENTS.md` file no longer contains scaffold text like `[Project Name]`, `[Example]`, or untouched purpose/routing markers.
- Any routed directory in Section 1 exists and owns the required local `AGENTS.md`, or that route has been removed.

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
2. Confirm the skill exists locally under `.agents/skills/<skill>` or exists in the global catalog.
3. Confirm the skill owns a built-in suite at `.agents/skills/<skill>/evals/suite.json`.
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
8. If the report says `hard checks only`, that means the suite is intentionally rules-only. If the suite defines `judgePrompt` and the fixed judges were unavailable, the hard-check section still renders. Unless the hard floor independently proves a regression, the CLI comparison remains `NO SIGNAL`; product-facing reporting maps that to `ProductClaim: UNVERIFIED` with `EvidenceReason: NO_SIGNAL`. Neither is a pass. Rerun with both OpenAI and Anthropic credentials available if you need the full suite verdict.
9. Run `vasir eval inspect <skill>` to reopen the latest saved run and see the exact baseline/treatment outputs and judge reasons that moved the score.
10. If you changed the scorer logic, run `vasir eval rescore <skill>` before trusting an older saved summary.
11. If token totals show as unavailable, confirm you are running a live provider. `--model mock` does not report provider usage.
12. Rerun the eval and inspect the printed results directory under `.agents/vasir-evals/` if a partial run was written.

Verification:

- `vasir eval run <skill>` exits successfully.
- The command prints a results path under `.agents/vasir-evals/<skill>/...`.
- That directory contains `run.json`.

### Independent benchmark rescore recovery

If an independent benchmark has complete model responses but interrupted judging:

1. Run `vasir eval rescore <benchmark> <run-id>`.
2. Leave the source artifact untouched. The command writes a new linked artifact.
3. If the rescore is interrupted again, rerun it from the newest linked artifact. Compatible completed judge/pair batches are reused.
4. If Vasir reports a generation-contract mismatch, do not force the old responses into the new benchmark. Restore the matching definition or run a fresh benchmark edition.

The current Engineering v1 scorer sends one matched Minimal-baseline/Architecture-skill pair to each of the three fixed judges. A scoring-edition change can rescore the complete saved response set without rerunning models. Adding a model under the same edition judges only that model's three new pairs and never rescales incumbents.

## Benchmark Publication Errors

Use this section for:

- `BENCHMARK_PUBLISH_SUBCOMMAND_REQUIRED`
- `BENCHMARK_PUBLISH_CONFIG_INVALID`
- `BENCHMARK_PUBLISH_PROJECTION_INVALID`
- `BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE`
- `BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED`
- `BENCHMARK_PUBLISH_TOOL_MISSING`
- `BENCHMARK_PUBLISH_ACCOUNT_MISMATCH`
- `BENCHMARK_PUBLISH_ARTIFACT_INVALID`
- `BENCHMARK_PUBLISH_STORAGE_BUDGET_EXCEEDED`
- `BENCHMARK_PUBLISH_BUSY`
- `BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED`
- `BENCHMARK_PUBLISH_UPLOAD_FAILED`
- `BENCHMARK_PUBLISH_ACTIVATION_FAILED`
- `BENCHMARK_PUBLISH_VERIFICATION_FAILED`
- `BENCHMARK_PUBLISH_ROLLBACK_FAILED`

Every publication error includes a stage, the release identifier when known, the fixed stack name, a safe retry action, and the rollback outcome. With `--json`, read those values from `context`. Never paste AWS credentials, session tokens, or signed request material into an issue or diagnostic log.

Start with the non-mutating path:

```bash
vasir benchmark publish --dry-run
```

Then follow the recovery for the reported code.

### Configuration, acceptance, and tool failures

For `BENCHMARK_PUBLISH_SUBCOMMAND_REQUIRED` or `BENCHMARK_PUBLISH_CONFIG_INVALID`:

1. Use the exact command `vasir benchmark publish`.
2. Run it from the Vasir source repository or pass `--repo-root <path>` for that repository.
3. Do not pass production target overrides; the domain, profile, account, region, and stack are fixed in `site/vasirbenchmark.com/deployment.json`.

For `BENCHMARK_PUBLISH_PROJECTION_INVALID` or `BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE`:

1. Read the projection source or selected run named in the error.
2. Confirm `benchmarks/public-results.json` selects exactly one immutable run for each intended benchmark and that every recorded SHA-256 matches the selected `run.json` bytes. Do not copy result values into the manifest or hand-edit generated `data.js`.
3. Development publication requires the complete matched 30-setting, two-condition response matrix with matching benchmark, configuration, treatment, and score-edition identities. The exact roster is the historical 27 settings plus Claude Fable 5.1 at xhigh, max, and ultracode; a missing or substituted configuration fails closed.
4. Confirm the active `backend-architecture-panel-median-v1` edition contains the three frozen task ids, equal task weights, one trial per task and condition, and the exact Sol-ultra, Terra-ultra, and Claude-Opus-5-max panel. Each task must use one matched pair per prompt, majority gates, median dimension ratings, and no synthesizer. The aggregate is the fixed mean of the three 0–100 task rubric scores; uplift is Architecture skill minus Minimal baseline in rubric points.
5. When adding a model, append only that model's six responses and judge its three matched pairs. Existing task scores, aggregate scores, and paired uplift must remain numerically invariant; only rank may change. If a task, rubric, weight, judge panel, aggregation method, generation contract, or trial policy changed, create a new score edition instead of merging incompatible results.
6. Repair the canonical taxonomy or benchmark definition when the error identifies definition drift. Repair or replace the selected run when it identifies missing, digest-mismatched, identity-mismatched, non-finite, or structurally incomplete evidence.
7. Rerun the dry run. These failures occur before private evidence is projected or AWS is mutated.

For `BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED`:

1. Read the changed paths reported by the error.
2. From `site/vasirbenchmark.com/`, run `./capture.sh` and resolve any source, harness, capture, or route failure.
3. Obtain human acceptance for the current source and canonical captures.
4. Renew `template-lock.json` with those exact accepted hashes, then rerun the dry run. There is no `--force` or acceptance bypass.

For `BENCHMARK_PUBLISH_TOOL_MISSING`:

1. Confirm `aws --version` succeeds.
2. Confirm Chrome or Chromium is available to `site/vasirbenchmark.com/capture.mjs`.
3. Rerun the dry run.

Verification:

- `vasir benchmark publish --dry-run` completes the acceptance, artifact, tool, and read-only identity actions.

### Account mismatch

`BENCHMARK_PUBLISH_ACCOUNT_MISMATCH` stops before any AWS mutation. Do not bypass it or change the fixed target to match an unintended caller.

```bash
aws sts get-caller-identity --profile faedark --region us-east-1
```

The returned `Account` must be `339713108333`. Repair the local `faedark` authentication or profile selection, then rerun the dry run.

### Artifact and storage failures

For `BENCHMARK_PUBLISH_ARTIFACT_INVALID`:

1. Fix only the paths identified by the error.
2. Confirm all eight checked-in presentation files exist, are regular files rather than symlinks, and remain within the documented byte limits. The ninth and tenth artifact members, `data.js` and report-only `responses.js`, must be generated by the projector.
3. Remove or replace any local or relative public link that falls outside the finite deployed route graph.
4. Rerun the dry run before publishing.

If the generated site loses the paired D3 leaderboard, shared absolute-score scale, synchronized comparison guide, Benchmark tests ledger, Efficiency view, sidebar, or report hierarchy, treat it as a presentation regression rather than an acceptable empty-data state. Restore the accepted presentation source, keep unsupported marks absent, run `site/vasirbenchmark.com/capture.sh`, and renew the acceptance receipt only after the full desktop and mobile journeys pass. The current development projection should show one Engineering category, three benchmarks, 30 matched settings, 60 Minimal-baseline/Architecture-skill entries, 180 scored response cells, and three reports; it should not show a cost control or speculative future families.

For `BENCHMARK_PUBLISH_STORAGE_BUDGET_EXCEEDED`, publication has stopped before upload. Follow the returned `safeRetry` guidance and do not delete the active or immediately previous verified release. The command will not proceed while retained releases plus the candidate exceed 1 GiB.

### Active publisher lease

`BENCHMARK_PUBLISH_BUSY` means another publisher owns the conditional S3 lease.

- Do not delete a fresh lease or attempt a second activation path.
- Wait for the active publisher to finish and release it, then rerun the same command.
- A lease expires after 120 minutes, while one process may hold it for at most 75 minutes. On a later rerun, Vasir may replace an expired lease only if its observed ETag still matches, preventing one publisher from stealing or deleting another publisher's lease.

If a process was interrupted while holding the lease, rerunning after the lease is released or expires is the supported recovery path.

### Infrastructure failure

For `BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED`, inspect the `vasirbenchmark-production` stack event that corresponds to the returned stage and stack context:

```bash
aws cloudformation describe-stack-events \
  --stack-name vasirbenchmark-production \
  --profile faedark \
  --region us-east-1
```

Repair the reported AWS boundary, then rerun `vasir benchmark publish`. The command converges the same stack; do not create a replacement stack manually. Failed or unknown terminal stack states are reported without speculative repair.

### Upload or activation failure

For `BENCHMARK_PUBLISH_UPLOAD_FAILED` or `BENCHMARK_PUBLISH_ACTIVATION_FAILED`, the candidate upload is immutable and safe to reuse. Activation includes the function-pointer update and a bounded invalidation of `/`, `/index.html`, and `/benchmark-report.html`; inspect the reported pointer and invalidation context instead of assuming which release is serving. Repair the reported boundary and rerun the same command; identical source bytes use the same release identifier.

### Verification, rollback, and an indeterminate first release

For `BENCHMARK_PUBLISH_VERIFICATION_FAILED`, inspect `context.rollback` before retrying:

- If a previous verified release existed, Vasir attempts to restore and publicly verify that pointer before returning the error. Use the reported rollback outcome rather than assuming the candidate or prior release is live.
- If this was the first release, there is no prior public value to restore. A post-activation failure reports `rollback.status: "indeterminate"`. Treat the public state as unverified and rerun `vasir benchmark publish`; the same command is responsible for verifying or replacing it.

`BENCHMARK_PUBLISH_ROLLBACK_FAILED` means the attempt to restore the previous pointer did not complete or could not be publicly verified. Do not edit the CloudFront Function or S3 origin manually. Inspect the stack events, repair the reported AWS failure, and rerun the same command. Until it succeeds, treat the live URL as unverified.

Verification:

- `vasir benchmark publish` exits successfully only after `https://vasirbenchmark.com` serves the exact active release over valid HTTPS.
- `https://vasirbenchmark.com/benchmark-report.html#hyper-scale-chat` opens the expected report in a real browser.
- Combined and Engineering each retain Leaderboard, Benchmark tests, and Efficiency routes, and all three current benchmark report fragments resolve in a real browser.
- The UI states `Engineering v1 · 3 tasks × 1 trial · 3 judges`, names `Minimal baseline` and `Architecture skill`, omits cost, and contains no private run path or judge record. Report inspectors contain only exact selected generation messages and outputs.
- Every primary `/100` value is the fixed equal-weight mean of the three task scores; uplift is a secondary rubric-point difference and rank is derived.
- Reports show all 30 matched settings and describe the fixed three-judge, majority-gate, median-dimension method without claiming a confidence interval.
- The command reports all ten verified artifact files, every family/view route and report derived from the current projection, required security headers, and a private S3 origin.

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
