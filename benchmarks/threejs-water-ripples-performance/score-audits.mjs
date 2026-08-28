#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runBenchmarkAgent } from '../../cli/eval/agent-runtime.js';
import { resolveBenchmarkConfiguration } from '../../cli/eval/benchmark-models.js';

const BENCHMARK_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(BENCHMARK_DIRECTORY, '..', '..');
const RUNS_ROOT = join(
  REPOSITORY_ROOT,
  '.agents',
  'vasir-evals',
  'threejs-water-ripples-performance'
);
const RUBRIC_PATH = join(BENCHMARK_DIRECTORY, 'audit-rubric.json');
const JUDGES = Object.freeze([
  resolveBenchmarkConfiguration('codex:gpt-5.6-sol@ultra'),
  resolveBenchmarkConfiguration('claude:opus@max')
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function usage() {
  return [
    'Usage:',
    '  node benchmarks/threejs-water-ripples-performance/score-audits.mjs --run-id <run-id>',
    '  node benchmarks/threejs-water-ripples-performance/score-audits.mjs --run-dir <exact-run-directory>'
  ].join('\n');
}

function parseArguments(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { help: true };
  invariant(argv.length === 2 && ['--run-id', '--run-dir'].includes(argv[0]), usage());
  const requestedPath = argv[0] === '--run-id'
    ? join(RUNS_ROOT, argv[1])
    : isAbsolute(argv[1]) ? argv[1] : resolve(process.cwd(), argv[1]);
  return { help: false, requestedPath };
}

function isDirectChild(root, candidate) {
  const fromRoot = relative(root, candidate);
  return fromRoot !== ''
    && fromRoot !== '..'
    && !fromRoot.startsWith(`..${sep}`)
    && !isAbsolute(fromRoot)
    && dirname(candidate) === root;
}

async function resolveRunDirectory(requestedPath) {
  const [root, candidate] = await Promise.all([realpath(RUNS_ROOT), realpath(requestedPath)]);
  invariant(isDirectChild(root, candidate), `Run directory must be one direct child of ${root}`);
  invariant((await stat(candidate)).isDirectory(), `Run path is not a directory: ${candidate}`);
  return candidate;
}

async function writeAtomic(filePath, contents, mode = 0o600) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temporaryPath, contents, { mode });
  await rename(temporaryPath, filePath);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function outputSchema(labels, criterionIds) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['scores'],
    properties: {
      scores: {
        type: 'array',
        minItems: labels.length,
        maxItems: labels.length,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'criteria', 'total', 'fatalViolations', 'rationale'],
          properties: {
            label: { type: 'string', enum: labels },
            criteria: {
              type: 'array',
              minItems: criterionIds.length,
              maxItems: criterionIds.length,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'points', 'evidence'],
                properties: {
                  id: { type: 'string', enum: criterionIds },
                  points: { type: 'integer', minimum: 0, maximum: 2 },
                  evidence: { type: 'string' }
                }
              }
            },
            total: { type: 'integer', minimum: 0, maximum: 20 },
            fatalViolations: { type: 'array', items: { type: 'string' } },
            rationale: { type: 'string' }
          }
        }
      }
    }
  };
}

function buildJudgePrompt(rubric, labeledResponses) {
  const responseText = labeledResponses
    .map(({ label, text }) => `## ${label}\n\n${text}`)
    .join('\n\n');
  return `You are grading anonymous performance audits of one frozen Three.js water-ripple source file.

Score each response independently against the exact rubric below. Use only integer 0, 1, or 2 points per criterion. Cite a short answer-specific phrase or state what is missing. Generic advice earns no credit. A proposed quality reduction or render-topology multiplier is a fatal violation and cannot earn credit for the affected criterion. Do not compare writing style, verbosity, provider, or likely author. Return every response and every criterion exactly once.

## Rubric

${JSON.stringify(rubric, null, 2)}

## Anonymous responses

${responseText}`;
}

function validateJudgePayload(payload, labels, criteria) {
  invariant(payload && Array.isArray(payload.scores), 'Judge payload is missing scores');
  invariant(payload.scores.length === labels.length, 'Judge returned the wrong response count');
  const seenLabels = new Set();
  const criterionIds = criteria.map(({ id }) => id);
  for (const score of payload.scores) {
    invariant(labels.includes(score.label) && !seenLabels.has(score.label), `Invalid judge label ${score.label}`);
    seenLabels.add(score.label);
    invariant(Array.isArray(score.criteria) && score.criteria.length === criterionIds.length, `${score.label}: wrong criterion count`);
    const seenCriteria = new Set();
    let total = 0;
    for (const criterion of score.criteria) {
      invariant(criterionIds.includes(criterion.id) && !seenCriteria.has(criterion.id), `${score.label}: invalid criterion ${criterion.id}`);
      invariant(Number.isInteger(criterion.points) && criterion.points >= 0 && criterion.points <= 2, `${score.label}: invalid points`);
      seenCriteria.add(criterion.id);
      total += criterion.points;
    }
    invariant(score.total === total, `${score.label}: reported total ${score.total} does not equal ${total}`);
  }
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomBytes(4).readUInt32BE(0) % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const runDirectory = await resolveRunDirectory(options.requestedPath);
  const runPath = join(runDirectory, 'run.json');
  const [run, rubric, rubricBytes] = await Promise.all([
    readJson(runPath),
    readJson(RUBRIC_PATH),
    readFile(RUBRIC_PATH)
  ]);
  invariant(run.benchmarkId === 'threejs-water-ripples-performance', 'Wrong benchmark run');
  invariant(run.runStatus === 'generation-complete', `Generation is not complete: ${run.runStatus}`);
  const auditRows = run.rows.filter(({ lane, status }) => lane === 'audit' && status === 'complete');
  invariant(auditRows.length === run.models.length * 2, `Expected ${run.models.length * 2} complete audit rows`);

  const labelPool = auditRows.map((_, index) => `Response ${String.fromCharCode(65 + index)}`);
  const shuffledRows = shuffled(auditRows);
  const labeledResponses = await Promise.all(shuffledRows.map(async (row, index) => ({
    label: labelPool[index],
    rowId: row.rowId,
    text: (await readFile(join(runDirectory, row.responsePath), 'utf8')).trim()
  })));
  const labels = labeledResponses.map(({ label }) => label);
  const criterionIds = rubric.criteria.map(({ id }) => id);
  const schema = outputSchema(labels, criterionIds);
  const prompt = buildJudgePrompt(rubric, labeledResponses);
  const scoringDirectory = join(runDirectory, 'audit-scoring');
  await mkdir(scoringDirectory, { recursive: false, mode: 0o700 });
  await writeAtomic(join(scoringDirectory, 'rubric.json'), rubricBytes);
  await writeAtomic(join(scoringDirectory, 'judge-prompt.txt'), prompt);
  await writeAtomic(join(scoringDirectory, 'label-map.json'), `${JSON.stringify(
    labeledResponses.map(({ label, rowId }) => ({ label, rowId })), null, 2
  )}\n`);

  const judgeResults = await Promise.all(JUDGES.map(async (configuration) => {
    const result = await runBenchmarkAgent({ configuration, promptText: prompt, outputSchema: schema });
    let payload;
    try {
      payload = JSON.parse(result.text);
    } catch (error) {
      throw new Error(`${configuration.id}: judge output was not JSON: ${error.message}`);
    }
    validateJudgePayload(payload, labels, rubric.criteria);
    const fileSlug = configuration.id.replace(/[^a-zA-Z0-9]+/g, '-');
    const receipt = {
      configuration,
      durationMs: result.durationMs,
      usage: result.usage,
      costUsd: result.costUsd,
      runtimeReceipt: result.runtimeReceipt,
      output: payload
    };
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
    await writeAtomic(join(scoringDirectory, `${fileSlug}.json`), receiptBytes);
    return { configuration, payload, receiptPath: `audit-scoring/${fileSlug}.json`, receiptSha256: sha256(receiptBytes) };
  }));

  const labelToRow = new Map(labeledResponses.map(({ label, rowId }) => [label, rowId]));
  const rows = auditRows.map((row) => {
    const label = labeledResponses.find((entry) => entry.rowId === row.rowId).label;
    const judgeScores = judgeResults.map(({ configuration, payload, receiptPath }) => {
      const score = payload.scores.find((entry) => entry.label === label);
      return { judgeId: configuration.id, receiptPath, ...score };
    });
    return {
      rowId: row.rowId,
      pairId: row.pairId,
      configurationId: row.configuration.id,
      condition: row.condition,
      score: average(judgeScores.map(({ total }) => total)),
      judgeScores
    };
  });
  invariant(rows.every(({ rowId }) => [...labelToRow.values()].includes(rowId)), 'Label mapping lost a row');
  const pairs = run.pairs.filter(({ lane }) => lane === 'audit').map((pair) => {
    const clean = rows.find((row) => row.pairId === pair.pairId && row.condition === 'clean');
    const skill = rows.find((row) => row.pairId === pair.pairId && row.condition === 'skill');
    invariant(clean && skill, `${pair.pairId}: missing audit score`);
    return {
      pairId: pair.pairId,
      configurationId: pair.configurationId,
      cleanScore: clean.score,
      skillScore: skill.score,
      lift: skill.score - clean.score,
      outcome: skill.score > clean.score ? 'skill-win' : skill.score < clean.score ? 'clean-win' : 'tie'
    };
  });
  const summary = {
    kind: 'threejs-water-ripples-audit-scoring',
    schemaVersion: 1,
    runId: run.runId,
    rubric: {
      path: 'audit-scoring/rubric.json',
      sha256: sha256(rubricBytes),
      maximumScore: rubric.scoreRange.max
    },
    judges: judgeResults.map(({ configuration, receiptPath, receiptSha256 }) => ({
      configuration,
      receiptPath,
      receiptSha256
    })),
    rows,
    pairs,
    aggregate: {
      cleanMean: average(rows.filter(({ condition }) => condition === 'clean').map(({ score }) => score)),
      skillMean: average(rows.filter(({ condition }) => condition === 'skill').map(({ score }) => score)),
      skillWins: pairs.filter(({ outcome }) => outcome === 'skill-win').length,
      cleanWins: pairs.filter(({ outcome }) => outcome === 'clean-win').length,
      ties: pairs.filter(({ outcome }) => outcome === 'tie').length
    },
    claimBoundary: 'This scores source-grounded audit coverage. It does not prove that any proposed or implemented optimization improves runtime.'
  };
  const summaryBytes = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`);
  await writeAtomic(join(scoringDirectory, 'summary.json'), summaryBytes);
  const updatedRun = {
    ...run,
    auditScoring: {
      status: 'complete',
      summaryPath: 'audit-scoring/summary.json',
      summarySha256: sha256(summaryBytes),
      aggregate: summary.aggregate
    },
    nextRequiredAction: 'Verify implementation candidates, then run sequential browser performance measurements.'
  };
  await writeAtomic(runPath, Buffer.from(`${JSON.stringify(updatedRun, null, 2)}\n`));
  process.stdout.write(`${JSON.stringify(summary.aggregate, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
