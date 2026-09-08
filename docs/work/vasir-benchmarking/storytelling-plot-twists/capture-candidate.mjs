import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';

// Exercise the existing canonical browser checks against one pinned local
// candidate. This does not alter acceptance or publish anything.
const repo = process.cwd();
const proofDirectory = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Pass a retained rehearsal directory.');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const candidate = read(path.join(proofDirectory, 'candidate.json'));
const server = read(path.join(proofDirectory, 'server.json'));
if (candidate.releaseId !== server.releaseId) throw new Error('Candidate/server mismatch.');
const base = new URL(server.url);
if (base.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('Use the pinned local rehearsal.');
const output = path.join(proofDirectory, 'canonical');
if (fs.existsSync(output) && fs.readdirSync(output).length) throw new Error('Use a new, empty canonical proof directory; retain every previous attempt.');
fs.mkdirSync(output, { recursive: true });
const captureSourcePath = 'site/vasirbenchmark.com/capture.mjs';
const initialHarnessSha256 = hash(fs.readFileSync(captureSourcePath));
const expected = {
  overall: '4b51cf8398cc2e019ce565508e664a41469a74a19054f0131702aa541a08f0a8',
  games: 'd49291d02d6dae20fcc59a4ab9b8c4b9629fe89567365e410619c60834f1df5d',
  aiWorkflows: '3efa56a9e45c89d008691ed72d0e6da2b78dc9135586c6447578afe66840ec13',
  scoreBasis: '67a07945de60bae1623b65068a95ae5841418d62e59c1735c9cbc69b3a178512',
  settings: '6a8347d2e3ebf5003df995d6fea6ed76132f219d8d57d914ac31a706d9aa076c',
  benchmarkResults: 'db4ae6f38f8990a958725bc00a39a1aef4c98060d464f51df72e7b493ccff7ce'
};
const dataFile = candidate.siteFiles.find(file => file.path === 'data.js');
const dataBytes = fs.readFileSync(dataFile.sourcePath);
if (hash(dataBytes) !== dataFile.sha256) throw new Error('Pinned data changed.');
const context = { window: {} };
vm.runInNewContext(dataBytes.toString('utf8'), context);
const preservation = Object.fromEntries(Object.keys(expected).map(key => [key, hash(JSON.stringify(context.window.VASIR_DATA[key]))]));
if (Object.keys(expected).some(key => expected[key] !== preservation[key])) throw new Error('An existing score family changed.');
const views = [
  ['leaderboard', ''], ['capabilities', '-capabilities'], ['capability-benchmarks', '-capability-benchmarks'],
  ['efficiency', '-efficiency'], ['report', '-benchmark-report'], ['workflows', '-workflows'],
  ['workflow-benchmarks', '-workflow-benchmarks'], ['workflow-efficiency', '-workflow-efficiency'],
  ['workflow-report', '-workflow-report'], ['games', '-game-models'],
  ['game-benchmarks', '-game-benchmarks'], ['game-efficiency', '-game-efficiency']
];
const tasks = ['desktop', 'mobile'].flatMap(viewport => views.map(([target, suffix]) => ({
  target, viewport, width: viewport === 'desktop' ? 1440 : 390,
  height: viewport === 'desktop' ? 1000 : 844, filename: `${viewport}${suffix}.png`
})));
for (const target of ['leaderboard', 'capabilities', 'report', 'workflows', 'workflow-report', 'games', 'game-benchmarks', 'game-efficiency']) {
  tasks.push({ target, viewport: 'tablet', width: 820, height: 1000, filename: `tablet-${target}.png` });
}
const results = [];
async function worker() {
  while (tasks.length) {
    const task = tasks.shift();
    const page = new URL(['report', 'workflow-report'].includes(task.target) ? '/benchmark-report.html' : '/index.html', base).href;
    const args = ['site/vasirbenchmark.com/capture.mjs', page, path.join(output, task.filename), String(task.width), String(task.height), task.target];
    const child = spawn(process.execPath, args, { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', bytes => { log += bytes.toString(); });
    child.stderr.on('data', bytes => { log += bytes.toString(); });
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    fs.writeFileSync(path.join(output, `${task.filename}.log`), log, { flag: 'wx' });
    const png = code === 0 ? fs.readFileSync(path.join(output, task.filename)) : null;
    const result = { ...task, code, ...(png ? { bytes: png.length, sha256: hash(png) } : {}), log };
    results.push(result);
    process.stdout.write(JSON.stringify({ target: task.target, viewport: task.viewport, code }) + '\n');
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
const finalHarnessSha256 = hash(fs.readFileSync(captureSourcePath));
const receipt = { kind: 'vasirbenchmark-canonical-candidate-review', status: results.length === 32 && results.every(result => result.code === 0) && initialHarnessSha256 === finalHarnessSha256 ? 'passed' : 'failed',
  releaseId: candidate.releaseId, createdAt: new Date().toISOString(), preservation,
  source: { path: captureSourcePath, initialSha256: initialHarnessSha256, sha256: finalHarnessSha256 },
  results: results.sort((a, b) => a.filename.localeCompare(b.filename)) };
fs.writeFileSync(path.join(output, 'canonical-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
if (receipt.status !== 'passed') process.exitCode = 1;
