import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const repo = process.cwd();
assert.ok(process.argv[2], 'Provide a fresh proof output directory');
const output = path.resolve(process.argv[2]);
fs.mkdirSync(output, { recursive: true });
assert.ok(!fs.existsSync(path.join(output, 'canonical-receipt.json')), 'Do not overwrite a previous proof');
const site = path.join(repo, 'site/vasirbenchmark.com');
const lock = JSON.parse(fs.readFileSync(path.join(site, 'template-lock.json'), 'utf8'));
const targets = {
  '#capabilities/overall': 'leaderboard', '#capabilities/engineering': 'capabilities',
  '#capabilities/engineering/benchmarks': 'capability-benchmarks', '#capabilities/overall/efficiency': 'efficiency',
  '#hyper-scale-chat': 'report', '#capabilities/ai-workflows': 'workflows',
  '#capabilities/ai-workflows/benchmarks': 'workflow-benchmarks', '#capabilities/ai-workflows/efficiency': 'workflow-efficiency',
  '#work-spec-chat': 'workflow-report', '#capabilities/games': 'games',
  '#capabilities/games/benchmarks': 'game-benchmarks', '#capabilities/games/efficiency': 'game-efficiency'
};
const jobs = lock.captures.filter(capture => targets[capture.route.replace(/^\//, '')]).map(capture => ({
  ...capture, target: targets[capture.route.replace(/^\//, '')], destination: path.join(site, capture.path)
}));
assert.equal(jobs.length, 24, 'Canonical shared image inventory changed');
for (const target of ['leaderboard', 'capabilities', 'report', 'workflows', 'workflow-report', 'games', 'game-benchmarks', 'game-efficiency']) {
  jobs.push({ target, width: 820, height: 1000, destination: path.join(output, `midwidth-${target}.png`) });
}
const pin = filename => {
  const bytes = fs.readFileSync(filename);
  return { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
};
assert.ok(process.argv[3], 'Provide the final candidate.json');
const candidatePath = path.resolve(process.argv[3]);
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
assert.match(candidate.releaseId, /^[a-f0-9]{64}$/);
const candidateReceipt = { path: candidatePath, releaseId: candidate.releaseId, ...pin(candidatePath) };
for (const record of [...candidate.presentationSources, ...candidate.infrastructureSources]) {
  assert.equal(pin(path.join(site, record.path)).sha256, record.sha256, `Candidate source changed: ${record.path}`);
}
const sourceFiles = ['capture.mjs', 'capture.sh', 'index.html', 'app.js', 'style.css', 'data.js', 'responses.js', 'benchmark-report.html', 'benchmark-report.js', 'benchmark-report.css'];
const sourcePins = sourceFiles.map(file => ({ path: `site/vasirbenchmark.com/${file}`, ...pin(path.join(site, file)) }));
const startedAt = new Date().toISOString();
const results = [];
let next = 0;
const concurrency = 2;
const execute = job => new Promise(resolve => {
  const args = [path.join(site, 'capture.mjs'), path.join(site, job.target.includes('report') ? 'benchmark-report.html' : 'index.html'), job.destination, String(job.width), String(job.height), job.target];
  const started = Date.now();
  const child = spawn(process.execPath, args, { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', bytes => { stdout += bytes; });
  child.stderr.on('data', bytes => { stderr += bytes; });
  child.on('error', error => { stderr += error.message; });
  child.on('close', code => {
    const screenshot = code === 0 ? { path: path.relative(repo, job.destination), ...pin(job.destination) } : null;
    const result = { target: job.target, width: job.width, height: job.height, command: [process.execPath, ...args], exitCode: code, durationMs: Date.now() - started, stdout, stderr, screenshot };
    results.push(result);
    process.stdout.write(`${results.length}/32 ${job.target} ${job.width}px ${code === 0 ? 'passed' : 'FAILED'}\n`);
    resolve(result);
  });
});
await Promise.all(Array.from({ length: concurrency }, async () => { while (next < jobs.length) await execute(jobs[next++]); }));
const sourceUnchanged = sourcePins.every(record => pin(path.join(repo, record.path)).sha256 === record.sha256);
const status = results.every(result => result.exitCode === 0) && sourceUnchanged ? 'passed' : 'failed';
const logPath = path.join(output, 'canonical.log');
fs.writeFileSync(logPath, results.map(result => result.stdout + result.stderr).join('') + `Canonical 32-check capture: ${status}\n`);
fs.writeFileSync(path.join(output, 'canonical-receipt.json'), JSON.stringify({ kind: 'vasirbenchmark-canonical-capture-run', startedAt, completedAt: new Date().toISOString(), status, concurrency, count: results.length, source: 'Same 24 persisted and 8 midwidth capture.mjs commands as capture.sh, run in bounded independent processes.', candidate: candidateReceipt, harnessSha256: sourcePins.find(record => record.path.endsWith('/capture.mjs')).sha256, log: { path: logPath, ...pin(logPath) }, sourcePins, sourceUnchanged, results }, null, 2) + '\n');
process.exitCode = status === 'passed' ? 0 : 1;
