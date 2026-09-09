# Same-account Dungeon Master continuation

The user authorized running all incomplete existing Writing benchmarks. This continuation uses the existing frozen expansion controller and original frozen provider runtime. The prompts, 33 configurations, six primary repetitions, transfer cases, intention-to-invoke policy, two counterbalanced Astra Ultra judge seats, and all frozen source bytes remain unchanged. Publication is outside this workstream.

The pre-resume checkpoint contained 110 completed outlines, 33 completed paired reviews, and six retained Codex quota failures. Codex has 736 planned outlines and 736 reviews; Claude has 320 planned outlines and 320 corresponding Codex reviews. The Codex-only continuation therefore has at most 626 missing writers plus 703 missing reviews, or 1,329 calls, at a root-allocated concurrency of two.

The exact 1,081-file archive is under `.agents/vasir-evals/dungeon-master-adventure-outline/completion-checkpoints/pre-resume-20260908T1841Z/`. Its receipt records the actual archive time, 2026-09-08T18:35:37.850Z; the directory label is not a timestamp claim. The archived run SHA-256 is `d8e35edd2fc4229045e2336ca32f283d00d5f004d3da14d6176e1e2976cfcdab`, and its file-inventory SHA-256 is `ca1ce96ea892c2c9c7883b823e99f0faf7b9d7ce040f89d6100612d771902ce6`.

Root's read-only same-account capacity receipt is `docs/work/vasir-benchmarking/writing-completion-20260908/codex-capacity-20260908T182639Z.json`, SHA-256 `7587345f5a1f5f3bb462194224de7e51556b11c87ff4e781eef748600ff965b6`. At 18:26:39Z it reported 17 percent weekly usage and no spending or rate-limit stop. This was followed by exactly one excluded Codex Astra low readiness completion through the original frozen Dungeon Master runtime. No account context changed.

The separately recorded operational helper `recover-capacity-20260908.mjs` verifies the archive, frozen source graph, original records, readiness proof, and unchanged account-context digests before that readiness call. Its exact source, request, result, raw streams, and resolution are retained under the run's `operator-capacity/readiness-2026-09-08T18-37-14.418Z/`. The frozen controller independently verified `resolution.json`, SHA-256 `f01aa17ad20795082f85d7a8444402e1544e3bb81c376f8d48de711d8979861d`, before scored dispatch. The scored checkpoint was unchanged by readiness.

Frozen execution session `execution-2026-09-08T18-37-53.105Z` began with `--recover --providers codex --concurrency 2 --maximum-calls 1329`. It follows the original frozen seeded ordering because that controller provides no separate model or judge priority selector. Existing successful results are reused; each eligible missing unit receives at most one new attempt during this invocation. Quota evidence stops new dispatch while active calls settle. Earlier failures remain in the attempt ledger and raw evidence tree. Claude remains undispatched until root confirms its current capacity.

Initial verification passed three targeted existing tests: exact drained archive preservation, completed-output reuse, and terminal quota stopping with explicit same-account recovery. The operational helper also passed Node's syntax check. After execution drains, use the helper's `--stage audit` with this run and archive to verify all 110 prior successful writers, all 33 prior completed reviews, all 85 original expansion attempts, and every archived file other than the naturally advancing run checkpoint. Its audit acquires the existing writer lock and refuses active attempts.

## Eight-call continuation after successful recovery

Root explicitly raised the allocation to eight concurrent calls after successful recovered outputs were confirmed. The first session received a graceful SIGTERM and drained at 18:46:57.003Z with exactly seven successful writer calls and no new failures. All six historical quota-failed writer slots recovered; their failed attempts remain. Coverage reached 117 outlines and 33 reviews.

The full audit `operator-capacity/audit-2026-09-08T18-48-12.525Z/audit.json` passed. It checked all 110 earlier successful writers, 33 earlier completed reviews, 85 earlier expansion attempts, and 1,080 unchanged archived files; it also verified the seven appended outputs, raw stream hashes and sizes, original prompt/configuration routing, fresh distinct sessions, and maximum observed concurrency two. The drained run SHA-256 was `48081de354a25dca7b04c22fc0c1f226c366a6295693e9ed9bebc3fe0eaf13e0`.

The next exact archive, `completion-checkpoints/pre-concurrency8-20260908T1848Z/`, contains 1,117 pinned files. Its actual archive time is 18:48:32.009Z and file-inventory SHA-256 is `be97cf83bd09e7850d1472791f5dfff47ae3ed546950ebadaab8e55a10eb6610`.

Fresh read-only capacity at 18:47:06.116Z reported 19 percent weekly usage, the same account context, and no spending or rate-limit stop. Receipt: `docs/work/vasir-benchmarking/writing-completion-20260908/codex-capacity-20260908T184706116Z.json`, SHA-256 `9729fbda532fd72f0bd7e62456754e1ff028848af94c049aa826479df3498b88`. No second provider readiness call was needed: the circuits were closed and seven actual same-account benchmark calls had succeeded.

The unchanged frozen controller resumed with `--recover --providers codex --concurrency 8 --maximum-calls 1322`, bounding its work to 619 remaining Codex writers and 703 missing fixed-panel reviews. The manifest already permits sixteen concurrent calls, so this changes only the operational allocation. Claude remains paused pending root's capacity confirmation.

The new execution is `execution-2026-09-08T18-49-17.183Z`. While it is active, the frozen controller leaves top-level `runStatus` at the previous `operator-paused` value until finalization. Current activity is established by the latest execution session's `running` status, the owned `run.lock`, and active attempt records. Do not edit the checkpoint to normalize that historical status field.

The separate operational audit now accepts up to eight concurrent calls and independently enforces each session's recorded allocation, including the first session's limit of two. Three new tests pass: eight accepted and nine rejected; old two-call limits and nonoverlapping boundaries; and invalid or unfinished timestamp rejection. No frozen dependency changed.

This note records an active continuation, not completed coverage. The durable `run.json` session and attempt ledger are authoritative for current progress; a later audit and exact archive should record the final drained checkpoint. Audit against the initial archive to verify the entire evening continuation, or against the second archive to verify only the eight-call phase.

## Sixteen-call continuation after the eight-call phase

Root explicitly allocated the frozen runner's maximum concurrency of sixteen after the eight-call phase remained error-free. That session received a graceful SIGTERM, stopped dispatch at 161 calls, and drained with all 161 successful. Combined with the first seven calls, the evening continuation had 168 successful scored calls, raising coverage to 257 outlines and 54 reviews. No new failure occurred, and every historical failure remains retained.

The full audit `operator-capacity/audit-2026-09-08T19-34-28.373Z/audit.json` passed against the initial evening archive. It verified all original successes and attempts, all 1,080 prior non-checkpoint files, all 168 new calls' raw/output hashes and distinct fresh sessions, exact requested configuration/prompt bindings, and every new review's frozen prompt, counterbalanced candidate order, and evidence schema. Maximum observed concurrency was eight; the earlier two-call session was also checked against its own bound.

The exact prior operational helper was retained as that audit directory's `operator-source.mjs` before editing it, SHA-256 `8a4e773dc848299dc0f1fcd8e2e2065d5bdd5da56177080f5d90e3245810af70`. The full checkpoint was then preserved in `completion-checkpoints/pre-concurrency16-20260908T1934Z/` at 19:34:47.116Z: 1,763 pinned files, run SHA-256 `81d259af6d7e1f506c82cf8dfd7b16c0943eee9b09cdb01b6a128e1f356e8648`, and file-inventory SHA-256 `670fffbe5348eefb43d842c2056f1e6f5055a87bc1ab193d7d16da3d5286c140`.

Only the operational audit's allocation ceiling/default and tests were then raised to sixteen. Each earlier session is still verified against its own recorded limit of two or eight. Four tests pass: sixteen accepted and seventeen rejected; the earlier two-call boundary; the earlier eight-call boundary; and invalid/unfinished timestamps. The updated helper SHA-256 is `651ebf0c95bf426f7623d454bd7ba6dcde2965a01229ed98d27d8cf68d22f796`. Frozen execution code and manifest remain unchanged.

The metadata-only capacity check at 19:35:59.217Z reported 34 percent weekly usage, unchanged account context, and no spending or rate-limit stop. Receipt: `docs/work/vasir-benchmarking/writing-completion-20260908/codex-capacity-20260908T193559217Z.json`, SHA-256 `a7fb17d8fcfcd3ebe4ca6278a1d6ba21933cd722be4dca0493363616cebeae56`. It started no model turn and made no authentication, credit, or purchase change.

The frozen controller resumed with `--recover --providers codex --concurrency 16 --maximum-calls 1161`, allowing at most 479 missing Codex writers and 682 missing fixed Astra Ultra reviews. Each missing unit receives at most one new attempt per invocation. New provider quota stops dispatch and drains active calls. Claude remains undispatched until root confirms its capacity. This continues the existing cohort and does not publish any result.

## Completed Codex cohort and final drained archive

Session `execution-2026-09-08T19-36-44.656Z` finished naturally at `2026-09-08T23:43:26.427Z`, with exactly 1,161 successful calls and no new failure. Its process (PID 40344, tool session 41574) exited zero and released the sole writer lock. All 736 Codex outlines and all 736 fixed-panel review calls are complete: 368 fully reviewed pairs, all six primary pairs and all ten transfer pairs for each of the 23 original Codex configurations. Across the three evening stages, 626 outlines and 703 review calls were added: 1,329 successes, with no quality rerolls or new scored failures.

The checkpoint correctly remains `checkpointed-incomplete` for the full 33-setting experiment. The untouched remainder is 160 Fable outlines, 160 Opus outlines, and 320 corresponding fixed Codex review calls. No Claude generation was dispatched during this continuation. Both execution circuits are closed. The ledger retains all 1,414 expansion attempts: 1,408 successful attempts and the six historical quota failures; the original parent evidence also remains intact.

The whole-evening audit passed at `2026-09-08T23:44:01.492Z`, retained in `operator-capacity/audit-2026-09-08T23-44-00.638Z/audit.json` (SHA-256 `e29ab53c45977b293bc5a3b82df4ac0f98bce06401d535f60266193b1c98cfe6`). It preserved all 110 prior successful writers, 33 prior reviews, 85 earlier expansion attempts, and 1,080 prior non-checkpoint files. It checked all 1,329 new attempts' raw/output hashes, distinct fresh sessions, exact prompt/configuration bindings, fixed reviewer identities, counterbalanced candidate order and output schema. Maximum observed concurrency was sixteen, with the earlier two- and eight-call stages independently checked against their own allocations. The four operational audit tests were rerun successfully before finalization.

The final exact archive is `.agents/vasir-evals/dungeon-master-adventure-outline/completion-checkpoints/codex-complete-20260908T2344Z/`, created at `2026-09-08T23:44:19.659Z`. It contains 6,409 read-only, byte-pinned files. An independent verification at `23:44:54.024Z` rehashed the entire archive, confirmed its frozen source inspection, checked read-only file modes, and found no lockfiles or running sessions/attempts.

- Run SHA-256: `24f73ab5b2020eb3836b01121a5dac73f4589dc43adc5ba9af4358fbab16b248`.
- Skill-snapshot file SHA-256: `3780ebe726e61c96c18add20e4d1e436ee28c563735709834672c0c3831b2aa6`.
- File-inventory SHA-256: `1a3ca419eb379f3bc5141f5c10fc1f42437d92cab4e4a0e4e0fa8bba0ce4de9a`.
- Archive-receipt SHA-256: `48ce5e415b210e35adca0d748c8ad81ab8cc04fa236d1f89185721575f498e19`.

Root received this immutable archive for publication. This workstream did not change publication selectors or the published site.

## Existing scheduling and recovery limits

Read-only inspection confirmed that the frozen executor has no primary-first, model-priority, or separate judge-only selector. It always sorts eligible writers and reviewers by the frozen seed and unit key; bounded `--maximum-calls` stages do not change that order. The older standalone judge/resume implementations are not supported replacements for this expanded run: they use a different checkpoint format and original implementation pins, and the original resume path would select a different judge configuration from the expanded roster.

The original recovery gate covers all historically interrupted providers, irrespective of the next invocation's writer-provider filter. A future Claude quota interruption would therefore require genuine post-interruption Claude readiness before another Codex-only invocation. No guard was weakened or cleared. Future Claude work requires root's explicit readiness/dispatch instruction, with exact prestate preservation and the original executor. The separate operational audit currently checks Codex `threadId` receipts; auditing a future Claude-containing stage would require a separately retained, tested audit-only extension for Claude `sessionId` receipts, not a change to frozen model execution.
