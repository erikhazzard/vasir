# DM expanded-cohort preparation v2

Private run: `.agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908-v2`.

Manifest: `57ba82bd9dedff7e038a2d4ff6855b06b68a40ba9a61dffca483ac7041544592`.

The controller defaults to four concurrent calls and permits an explicitly allocated ceiling of sixteen. The first scored batch is limited to four Codex calls. Claude dispatch is paused following the separately observed account quota limit; historical infrastructure readiness does not assert present provider availability. No model substitution or account-context switch is authorized.

## Preserved preparation and transport

V2 supersedes an edition with zero scored calls. The prior manifest, four excluded provider probes, failed provider-log preflight and entire evidence tree remain byte-pinned under `superseded-preparation/`; the original source directory is unchanged.

| Artifact | SHA256 |
| --- | --- |
| Original run | `0a78c5dba07da35e01448fcf6e2ab3ed16b248156089ecbb97b7e37ccbd0b95a` |
| Original judges | `44fc6639a4afcb2963621a07dc3d24444cfce0d0b9bfe09bc9dabbf5781455ce` |
| Prior manifest file, original and retained copy | `c14cbec33000e365bc30aa1114dfcb5bea3ab53e501b439ef298af55a2ee023b` |
| Prior failed preflight file, original and retained copy | `4537399e9b650564d8e16b0ab24e1e0cb2c5a65c2417db8bb692055a8cf1f9b0` |
| Frozen v2 controller | `1e01865ada271c29876f6dd9a99059a45727e51e9373de4fde481c2dc1a51b7f` |
| Frozen supplemental verifier | `6bffaee94b83a93c89c659eca18ff7ecf4bd92eafbd7dbc127b5431cae01d1b4` |
| Unchanged expansion runtime wrapper | `1349a6b0c840b6bd98b0608a7c2fc25f547e41ba3661e5400773bcb04ba38919` |
| Unchanged shared Read-tool runtime | `11e9d25cf4afc98d4900065fe8e8c9f8cfa4f3aa7bf31229f5b1ed3cc4fe26c2` |
| Unchanged imported, unused DM MCP helper | `417a837bb78840ecfec981f69d036356bf32883bf7baac2f44296c7613bc9e63` |

## Actual native sandbox supplement

Supplement: `native-preflight/2026-09-08T16-33-43.840Z/supplement.json`.

Supplement SHA256: `a1206740e31b505d88fe910cdc663a06f4aee033399873323d5d95a88953c8d7`.

Normalized exact sandbox configuration SHA256: `c6e9646f1a4b8b75ac06765b2f9281815ba317a3101e2a0366f0d9376d9dbc79`.

Two local `codex sandbox` commands ran with the original frozen DM permission profile. The allowed-workspace `cat` exited zero and returned the exact synthetic marker; the outside `cat` exited one, returned no stdout and reported `Operation not permitted`. There were zero model/provider calls in this supplemental diagnostic.

The verifier matched the native permission overrides against both recorded Codex creator arms. This is **native sandbox enforcement plus recorded invocation binding**, not an observed denied tool event in Codex's provider stream. The earlier provider-log proof remains failed. Claude's two earlier arms did retain actual denied Read events. Both providers retained complete mandatory frozen-reference bytes in their skill-arm probes.

Root independently ran the frozen verifier and approved the initial bounded batch. The first execution attempt failed closed because activation had not yet created `preflight.json`; it dispatched zero provider calls. Activation and subsequent execution are retained through the controller's supported commands, not manual assertion edits.

## First bounded scored batch

After root's independent review and explicit activation approval, readiness was activated through the frozen command. Session `execution-2026-09-08T16-37-28.520Z` ran exactly four Codex writers at concurrency four, with no retries or errors. All four requested configurations, prompt/output hashes, answer files, retained raw stdout/stderr hashes and distinct fresh sessions were checked independently; the publication validator also passed. The lock was released after every call completed.

| Configuration | Frozen task / arm | Duration | Words |
| --- | --- | ---: | ---: |
| Luna high | Primary, repetition 6, skill | 63.623 s | 940 |
| Terra max | Horror, repetition 2, baseline | 49.887 s | 741 |
| Luna high | Salvage, repetition 2, baseline | 46.441 s | 1,746 |
| Terra ultra | Primary, repetition 3, baseline | 16.686 s | 261 |

Luna high's skill answer retained an **incomplete reference-read receipt**: all three helper commands were recorded as exit zero, but the third command's JSONL `aggregated_output` was empty. Only the first two chunks (16,000 of 22,520 bytes) have observable matching output. The final 6,520 bytes are not claimed as observed. This is retained under the frozen DM intention-to-invoke policy and does not authorize regeneration, an adherence-based exclusion or inferred read completion.

At this checkpoint the source contains 36 of 1,056 completed outlines, 32 inherited paired-review calls (64 candidate assessments), 16 fully reviewed pairs and one headline-complete configuration. New completed outlines are not treated as judged scores. The checkpoint `run.json` SHA256 was `9f0c289ae6d34e07bf866102c603c0a117929c177a1f2bbcde85f27c3253347a`; later authorized checkpoints will naturally have new source hashes. Claude calls remained zero.

## Verification

Eleven expansion tests and thirty-two original runner/judging/publication tests pass. Checks cover the exact 33-configuration roster; original answer/review preservation; primary-versus-transfer arithmetic; fixed judge seats; routing; technical retry limits; quota and policy handling; drain-before-unlock pause behavior; concurrency defaults/ceiling; zero-scored-call supersession; and tampered supplemental evidence rejection. No public source selection or deployment changed during preparation.
