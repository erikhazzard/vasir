# DM and Plot twists source advancement

At 2026-09-09 02:54 UTC, root authorized selecting the already-audited
Dungeon Master and Plot twists checkpoints for the next website candidate.
This prepared local sources only: no deployment, provider call, mutable
benchmark-run write, prompt/model/panel change, or acceptance change occurred.

| Benchmark | Previous selected run SHA | New selected run SHA | Valid answers | Fully scored answers | Individual judgments |
| --- | --- | --- | --- | --- | --- |
| Plot twists | `7ae2b261eda8a368dc51c5df15b2d4e0c9aab78928149b90727530ceb31209ad` | `ac7128bdbeec86d7bb144c19f3fc778fda91ba4b9afdfea0a0c3f004ee3e8cac` | 520 → 539 | 476 → 494 | 952 → 988 |
| Dungeon Master | `24f73ab5b2020eb3836b01121a5dac73f4589dc43adc5ba9af4358fbab16b248` | `5827eb54dcb3794bc99dfc49cbdaa7e48c59bc259ba14ff4b54e2c09d15983de` | 736 → 784 | 736 → 736 | 1472 → 1476 |

Each benchmark retains exactly 23 complete Codex configurations. All 46
configuration/condition records preserve their exact score, displayed score,
rank, baseline score and delta. Neither benchmark gains a fully comparable
Claude configuration. New partial evidence stays partial; refusals and quota
failures remain retained. The frozen DM primary score basis is unchanged.

## Existing preparation API calls

The normal preparation helpers copied the exact audited run and skill files
into hash-named `publication-snapshots` directories. They require no recovery
flag and do not edit working runs. Equivalent preparation commands, from the
repository root:

```sh
node --input-type=module <<'NODE'
import { prepareWritingPublicationSource } from './cli/eval/writing-publication.js';
import { prepareDungeonMasterPublicationSource } from './cli/eval/dungeon-master-publication.js';
const repoRootDirectory = process.cwd();
console.log(prepareWritingPublicationSource({ repoRootDirectory,
  benchmarkId: 'storytelling-plot-twists',
  runDirectory: '.agents/vasir-evals/storytelling-plot-twists/storytelling-plot-twists-v1-completion-2026-09-08/operational-checkpoints/ac7128bdbeec86d7bb144c19f3fc778fda91ba4b9afdfea0a0c3f004ee3e8cac' }));
console.log(prepareDungeonMasterPublicationSource({ repoRootDirectory,
  runDirectory: '.agents/vasir-evals/dungeon-master-adventure-outline/completion-checkpoints/claude-quota-paused-20260909T0105Z' }));
NODE
```

Only `benchmarks/storytelling-plot-twists/publication.json` and
`benchmarks/dungeon-master-adventure-outline/publication.json` were updated to
the returned selections. Their frozen skill file SHAs remain respectively
`bd95674e5a5dfd99b4b47571bf08742f7c736bd1465d21ba8357bc42638f07e4`
and `3780ebe726e61c96c18add20e4d1e436ee28c563735709834672c0c3831b2aa6`.

`verifyWritingSourceSelections` admitted both advancements against accepted
release `eca33af1915830a52be741e7300a37700b423d9066eac81c2ef92176a218c822`,
preserving previously published answers, completed reviews, attempt prefixes,
completion manifests and DM cohort declaration. Exact pins, source lineage,
coverage and score-identity hashes are retained in the sibling JSON receipt.

Core and Magic selections remain byte-identical. Core therefore retains its
31-configuration provisional comparison; its 234 additional private reviews
are not silently substituted into the comparison. Website regeneration,
fresh candidate/browser acceptance and guarded deployment remain root-owned
follow-up work. Source selection is not evidence of live deployment.
