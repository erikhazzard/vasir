import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIB_DIR = dirname(fileURLToPath(import.meta.url));
export const BENCHMARK_DIR = resolve(LIB_DIR, '..');
export const REPO_ROOT = resolve(BENCHMARK_DIR, '..', '..');
export const RUNS_ROOT = join(REPO_ROOT, '.agents', 'vasir-evals', 'threejs-water-ripples-performance');
export const BASELINE_INDEX = join(BENCHMARK_DIR, 'fixture', 'index.html');

export function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index];
}

export function summarize(values, budgetMs = null) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return null;
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  const variance = finite.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / finite.length;
  let longestOverBudgetCluster = null;
  let budgetMisses = null;
  if (Number.isFinite(budgetMs)) {
    let current = 0;
    let longest = 0;
    budgetMisses = 0;
    for (const value of finite) {
      if (value > budgetMs) {
        budgetMisses += 1;
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    longestOverBudgetCluster = longest;
  }
  return {
    count: finite.length,
    min: Math.min(...finite),
    p50: percentile(finite, 0.5),
    p95: percentile(finite, 0.95),
    p99: percentile(finite, 0.99),
    max: Math.max(...finite),
    mean,
    standardDeviation: Math.sqrt(variance),
    coefficientOfVariationPct: mean === 0 ? null : (Math.sqrt(variance) / mean) * 100,
    budgetMs,
    budgetMisses,
    budgetMissPct: budgetMisses === null ? null : (budgetMisses / finite.length) * 100,
    longestOverBudgetCluster
  };
}

export function relativeDeltaPct(before, after) {
  if (!Number.isFinite(before) || !Number.isFinite(after) || before === 0) return null;
  return ((after - before) / before) * 100;
}

export function improvementPct(baseline, candidate) {
  const delta = relativeDeltaPct(baseline, candidate);
  return delta === null ? null : -delta;
}

export function isInside(root, candidate, allowRoot = false) {
  const pathFromRoot = relative(root, candidate);
  if (pathFromRoot === '') return allowRoot;
  return pathFromRoot !== '..'
    && !pathFromRoot.startsWith(`..${sep}`)
    && !isAbsolute(pathFromRoot);
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function resolveRun(runId) {
  invariant(/^[A-Za-z0-9][A-Za-z0-9._-]{4,160}$/.test(runId), `Invalid run id: ${runId}`);
  const root = await realpath(RUNS_ROOT);
  const directory = await realpath(join(root, runId));
  invariant(dirname(directory) === root && basename(directory) === runId, 'Run directory escaped the benchmark run root.');
  const runPath = join(directory, 'run.json');
  const run = JSON.parse(await readFile(runPath, 'utf8'));
  invariant(run.runId === runId, 'run.json identity does not match --run-id.');
  invariant(Array.isArray(run.rows), 'run.json does not contain rows[].');
  return { run, runPath, directory, root };
}

function resolveWorkspacePath(runDirectory, workspacePath) {
  invariant(typeof workspacePath === 'string' && workspacePath.length > 0, 'Implementation row has no workspacePath.');
  const candidate = isAbsolute(workspacePath)
    ? resolve(workspacePath)
    : resolve(runDirectory, workspacePath);
  invariant(isInside(runDirectory, candidate, false), `Workspace path escapes retained run: ${workspacePath}`);
  return candidate;
}

export async function discoverImplementationRows(runId, { requireIndexes = true } = {}) {
  const resolved = await resolveRun(runId);
  const rows = [];
  for (const row of resolved.run.rows.filter((entry) => entry.lane === 'implementation')) {
    const record = {
      rowId: row.rowId,
      pairId: row.pairId,
      lane: row.lane,
      condition: row.condition,
      configuration: row.configuration,
      generationStatus: row.status,
      artifactStatus: row.artifactStatus,
      workspacePath: row.workspacePath,
      indexPath: null,
      sourceSha256: null,
      discoveryStatus: 'INVALID',
      discoveryErrors: []
    };
    try {
      invariant(typeof row.rowId === 'string' && row.rowId.length > 0, 'Missing rowId.');
      invariant(['clean', 'skill'].includes(row.condition), `Unexpected condition: ${row.condition}`);
      invariant(row.status === 'complete', `Generation status is ${row.status}, expected complete.`);
      if (row.artifactStatus !== undefined) {
        invariant(row.artifactStatus === 'changed-index', `Artifact status is ${row.artifactStatus}, expected changed-index.`);
      }
      const resolvedWorkspacePath = resolveWorkspacePath(resolved.directory, row.workspacePath);
      const indexPath = basename(resolvedWorkspacePath) === 'index.html'
        ? resolvedWorkspacePath
        : join(resolvedWorkspacePath, 'index.html');
      const workspace = dirname(indexPath);
      invariant(isInside(resolved.directory, indexPath), 'Candidate index escaped its retained run.');
      if (requireIndexes) invariant(await pathExists(indexPath), 'Candidate workspace/index.html does not exist.');
      record.indexPath = indexPath;
      if (await pathExists(indexPath)) record.sourceSha256 = sha256(await readFile(indexPath));
      record.discoveryStatus = 'VALID';
    } catch (error) {
      record.discoveryErrors.push(error.message);
    }
    rows.push(record);
  }
  invariant(rows.length > 0, 'No implementation rows were found in run.json.');
  return { ...resolved, rows };
}

export async function baselineIdentity() {
  const resolved = await realpath(BASELINE_INDEX);
  invariant(isInside(BENCHMARK_DIR, resolved), 'Baseline fixture escaped benchmark directory.');
  const contents = await readFile(resolved);
  return { indexPath: resolved, directory: dirname(resolved), sha256: sha256(contents), bytes: contents.length };
}
