import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { buildBenchmarkPublicationArtifact } from '../../../../cli/benchmark-publication-artifact.js';

// Retain the supported publisher's full result while keeping terminal output
// concise. The publisher, including its acceptance and AWS guards, is unchanged.
if (!process.argv[2] || process.argv.length !== 3) throw new Error('Pass the accepted candidate directory.');
const directory = path.resolve(process.argv[2]);
const candidate = JSON.parse(fs.readFileSync(path.join(directory, 'candidate.json'), 'utf8'));
const artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory: process.cwd() });
if (artifact.releaseId !== candidate.releaseId) throw new Error('Accepted candidate changed before publication.');
const resultPath = path.join(directory, 'publish-result.json');
const stderrPath = path.join(directory, 'publish-stderr.log');
if (fs.existsSync(resultPath) || fs.existsSync(stderrPath)) throw new Error('Retain the original publish result; do not overwrite it.');
const child = spawn(process.execPath, ['bin/vasir.js', 'benchmark', 'publish', '--json'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '', stderr = '';
child.stdout.on('data', bytes => { stdout += bytes.toString(); });
child.stderr.on('data', bytes => { stderr += bytes.toString(); });
const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
fs.writeFileSync(resultPath, stdout, { flag: 'wx' });
fs.writeFileSync(stderrPath, stderr, { flag: 'wx' });
const result = JSON.parse(stdout);
process.stdout.write(JSON.stringify({ status: result.status, dryRun: result.dryRun, target: result.target,
  artifact: result.artifact && { releaseId: result.artifact.releaseId, fileCount: result.artifact.fileCount, totalBytes: result.artifact.totalBytes },
  deployment: result.deployment, verification: result.verification, actions: result.actions, error: result.error, resultPath }, null, 2) + '\n');
if (code !== 0 || result.status !== 'success' || result.dryRun || result.artifact?.releaseId !== candidate.releaseId || result.deployment?.activeReleaseId !== candidate.releaseId || result.verification?.status !== 'passed') process.exitCode = 1;
