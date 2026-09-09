import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWritingPublication } from '../../cli/eval/writing-publication.js';
import { buildDungeonMasterPublication } from '../../cli/eval/dungeon-master-publication.js';

// Preserve the exact four-ranked-model regression checkpoint independently of
// later score backfills. These are retained immutable sources, not new scores.
const repo = fileURLToPath(new URL('../../', import.meta.url));
const pins = [
  ['storytelling-core-idea', 'vasirbenchmark-writing-source', '0b47f5bfa55fdce4c3fba9044bac1270ec57df9ee1ae85030a9970c8cfb156ac', 'a4db1b5ea3ae79e9655be2ab793fa71e153571359a88d098a383bf94cd4667e5'],
  ['storytelling-plot-twists', 'vasirbenchmark-writing-source', 'cc357218c44344dc9d7e981e46e5c99d9f8ef8f9a77ebff3fb7c410555d28d24', 'bd95674e5a5dfd99b4b47571bf08742f7c736bd1465d21ba8357bc42638f07e4'],
  ['dungeon-master-adventure-outline', 'vasirbenchmark-dungeon-master-source', 'd8e35edd2fc4229045e2336ca32f283d00d5f004d3da14d6176e1e2976cfcdab', '3780ebe726e61c96c18add20e4d1e436ee28c563735709834672c0c3831b2aa6']
];
const selections = new Map(pins.map(([id, kind, runHash, skillHash]) => {
  const directory = `.agents/vasir-evals/${id}/publication-snapshots/${runHash}`;
  return [path.join(repo, `benchmarks/${id}/publication.json`), {
    kind, schemaVersion: 1,
    run: { path: `${directory}/run.json`, sha256: runHash },
    skill: { path: `${directory}/skill-snapshot.json`, sha256: skillHash }
  }];
}));
const magicId = 'storytelling-magic-discovery';
const magicDirectory = `.agents/vasir-evals/${magicId}/publication-snapshots/48fadf69fb9904e198ebfc61d892db9e6f4a8ea2e36c35c2ad72c8e7853b7168`;
selections.set(path.join(repo, `benchmarks/${magicId}/publication.json`), {
  kind: 'vasirbenchmark-storytelling-creation-source', schemaVersion: 1, benchmarkId: magicId,
  run: { path: `${magicDirectory}/run.json`, sha256: '233db3f8cf5c4db8ddd6432ff7323d7be567a46654213f9a00a148e04329a18f' },
  skill: { path: `${magicDirectory}/skill-snapshot.json`, sha256: 'bd95674e5a5dfd99b4b47571bf08742f7c736bd1465d21ba8357bc42638f07e4' },
  judging: { path: `${magicDirectory}/creation-judging.json`, sha256: '927abaeb682628de190bc609bd999c23a5be33e260ce3a989b10283a2b49f138' },
  judgeContext: { path: `${magicDirectory}/creation-judge-context.json`, sha256: 'ecbc9f56410245065b6d160c0a6f411ed2a5dcafab13a805efd1950b43d3e9fe' }
});

export function acceptedWritingRankingFixture() {
  const options = { repoRootDirectory: repo,
    readFileSyncImplementation: (file, encoding) => selections.has(file)
      ? JSON.stringify(selections.get(file)) : fs.readFileSync(file, encoding)
  };
  const { publicRelease, catalog, catalogCoverage, writingScoreBasis, compactBenchmarks, ...projection } = buildWritingPublication(options).projection;
  projection.additionalBenchmarks = {
    'dungeon-master-adventure-outline': buildDungeonMasterPublication(options).projection
  };
  // The historical fixture predates the versioned catalog and compact editions.
  // Keep its original score-selection semantics as well as its immutable scores.
  return projection;
}
