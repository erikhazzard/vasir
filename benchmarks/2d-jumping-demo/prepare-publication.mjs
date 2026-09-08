#!/usr/bin/env node
// Assemble only retained submissions, captures and completed review-seat outcomes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareGamesPublicationSource } from '../../cli/eval/games-publication.js';
import { buildBenchmarkPublicationProjection } from '../../cli/eval/benchmark-publication-projection.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [batchArgument, ...flags] = process.argv.slice(2);
if (!batchArgument || flags.some(flag => flag !== '--preview')) throw new Error('Usage: prepare-publication.mjs <retained-batch-directory> [--preview]');
const batch = path.relative(repo, path.resolve(batchArgument));
if (!batch || batch.startsWith('..') || path.isAbsolute(batch)) throw new Error('Batch must be inside this repository.');
const read = relative => JSON.parse(fs.readFileSync(path.join(repo, relative), 'utf8'));
const run = read(`${batch}/run.json`);
if (run.rows.length !== 8 || run.rows.some(row => !['complete', 'timeout'].includes(row.status))) throw new Error('Expected eight finalized generation outcomes.');
const editorial = read(`${batch}/publication-editorial-settings.json`);
const mediaByRowId = Object.fromEntries(run.rows.map(row => {
  const media = read(`${batch}/rows/${row.rowId}/media-selection.json`);
  if (!media.bundle || !media.video || !media.poster || !media.buildReceipt || !(media.receipt || media.mediaReceipt)) throw new Error(`Incomplete artifact evidence for ${row.rowId}`);
  return [row.rowId, { ...media, notes: [...(media.notes ?? []), ...(editorial.notesByRowId?.[row.rowId] ?? [])] }];
}));
const judgmentsByRowId = {};
const reviewOutcomesByRowId = {};
for (const pair of ['first-pair', 'terra-pair', 'sol-pair', 'astra-pair']) {
  const relative = `${batch}/judging/${pair}/publication-review-selection.json`;
  if (!fs.existsSync(path.join(repo, relative))) {
    if (flags.includes('--preview')) continue;
    throw new Error(`Review pair not finalized: ${pair}`);
  }
  const selection = read(relative);
  for (const [target, source] of [[judgmentsByRowId, selection.judgmentsByRowId], [reviewOutcomesByRowId, selection.reviewOutcomesByRowId]]) {
    for (const [rowId, records] of Object.entries(source)) {
      if (Object.hasOwn(target, rowId)) throw new Error(`Duplicate review pair for ${rowId}`);
      target[rowId] = records;
    }
  }
}
if (!flags.includes('--preview') && run.rows.some(row => reviewOutcomesByRowId[row.rowId]?.length !== 2)) throw new Error('Every row must retain both final reviewer outcomes, including missing assessments.');
const prepared = prepareGamesPublicationSource({
  repoRootDirectory: repo, runPath: `${batch}/run.json`, benchmark: editorial.benchmark,
  conditions: [{ id: 'bare', label: 'Bare' }, { id: 'vasir', label: 'With Vasir' }],
  mediaByRowId, judgmentsByRowId, reviewOutcomesByRowId,
  referencePath: '.agents/vasir-evals/2d-jumping-demo/reference-r23/reference.json',
  referenceReviewSelectionPath: ['publication-reference-selection-final.json', 'publication-reference-selection.json'].map(name => `.agents/vasir-evals/2d-jumping-demo/reference-r23/judging-2026-09-07/${name}`).find(relative => fs.existsSync(path.join(repo, relative))) ?? null
});
fs.writeFileSync(path.join(repo, prepared.selectionPath), `${JSON.stringify(prepared.selection, null, 2)}\n`);
const projection = buildBenchmarkPublicationProjection({ repoRootDirectory: repo });
const output = path.join(repo, batch, 'publication');
fs.writeFileSync(path.join(output, 'projected-data.js'), projection.dataSource);
fs.writeFileSync(path.join(output, 'projected-responses.js'), projection.responsesSource);
console.log(JSON.stringify({ preview: flags.includes('--preview'), selectionPath: prepared.selectionPath, sourcePath: prepared.sourcePath,
  rows: projection.projection.games.runs.map(row => ({ id: row.id, status: row.status, judgments: row.judgments.length, score: row.score?.value ?? null, video: Boolean(row.artifact?.videoUrl), game: Boolean(row.artifact?.playUrl) })),
  artifacts: projection.artifactFiles.length, bytes: projection.artifactFiles.reduce((sum, file) => sum + file.bytes, 0) }, null, 2));
