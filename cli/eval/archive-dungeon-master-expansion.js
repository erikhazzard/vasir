import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { dmDigest } from './dungeon-master-expansion-manifest.js';

// Archive only a drained, pinned checkpoint. This utility is outside the model
// execution graph: it never changes a prompt, result, transport or publication.
export async function archiveDungeonMasterExpansion({ runDirectory, archiveDirectory, authorization }) {
  assert.ok(authorization?.trim(), 'Explicit checkpoint archival authorization is required.');
  runDirectory = path.resolve(runDirectory); archiveDirectory = path.resolve(archiveDirectory);
  assert.ok(!archiveDirectory.startsWith(`${runDirectory}${path.sep}`) && archiveDirectory !== runDirectory, 'Archive must be outside the source tree.');
  assert.ok(!fs.existsSync(archiveDirectory), 'Archive destination already exists.');
  const lockPath = path.join(runDirectory, 'run.lock'), descriptor = fs.openSync(lockPath, 'wx', 0o600);
  fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, operation: 'archive-drained-dm-checkpoint', startedAt: new Date().toISOString() }));
  try {
    assert.ok(!fs.existsSync(path.join(runDirectory, 'judges.lock')), 'Judge writer is active.');
    const { inspectDungeonMasterExpansion } = await import(pathToFileURL(path.join(runDirectory, 'runtime-source/cli/eval/expand-dungeon-master-benchmark.js')));
    const run = inspectDungeonMasterExpansion(runDirectory);
    assert.ok(!run.expansionExecution.attempts.some(attempt => attempt.status === 'running'), 'A retained provider attempt has not drained.');
    assert.ok(!run.expansionExecution.sessions?.some(session => session.status === 'running'), 'A retained controller session has not drained.');
    fs.mkdirSync(path.dirname(archiveDirectory), { recursive: true });
    const stagingDirectory = fs.mkdtempSync(path.join(path.dirname(archiveDirectory), `${path.basename(archiveDirectory)}.staging-`));
    const files = [];
    function visit(relative = '') {
      for (const entry of fs.readdirSync(path.join(runDirectory, relative), { withFileTypes: true })) {
        const name = path.join(relative, entry.name);
        if (name === 'run.lock') continue;
        assert.ok(!entry.isSymbolicLink(), 'Archive refuses symlink evidence.');
        if (entry.isDirectory()) visit(name);
        else if (entry.isFile()) {
          assert.ok(!name.endsWith('.lock'), 'Another retained evidence writer is active.');
          const bytes = fs.readFileSync(path.join(runDirectory, name)), target = path.join(stagingDirectory, name);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o400 });
          files.push({ path: name, bytes: bytes.length, sha256: dmDigest(bytes) });
        }
      }
    }
    visit(); files.sort((a, b) => a.path.localeCompare(b.path));
    for (const file of files) for (const root of [runDirectory, stagingDirectory]) {
      const bytes = fs.readFileSync(path.join(root, file.path));
      assert.equal(bytes.length, file.bytes); assert.equal(dmDigest(bytes), file.sha256, `Checkpoint changed while archiving: ${file.path}`);
    }
    const receipt = { schemaVersion: 1, method: 'exact-drained-dm-expansion-tree-v1', authorization, archivedAt: new Date().toISOString(),
      runId: run.runId, manifestHash: run.cohortExtension.manifestHash, runSha256: files.find(file => file.path === 'run.json').sha256,
      runStatus: run.runStatus, completedRows: run.rows.filter(row => row.rowStatus === 'complete').length,
      completedReviewCalls: run.judging.pairs.flatMap(pair => pair.judges).filter(judge => judge.status === 'completed').length,
      expansionAttempts: run.expansionExecution.attempts.length, controllerSessions: run.expansionExecution.sessions?.length || 0,
      archiveUtilitySha256: dmDigest(fs.readFileSync(fileURLToPath(import.meta.url))), files, treeSha256: dmDigest(files) };
    fs.writeFileSync(path.join(stagingDirectory, 'checkpoint-archive.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o400 });
    fs.renameSync(stagingDirectory, archiveDirectory);
    return receipt;
  } finally { fs.closeSync(descriptor); fs.unlinkSync(lockPath); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { 'run-directory': { type: 'string' }, 'archive-directory': { type: 'string' }, authorization: { type: 'string' } } });
  assert.ok(values['run-directory'] && values['archive-directory'], 'Both source and new archive directories are required.');
  archiveDungeonMasterExpansion({ runDirectory: values['run-directory'], archiveDirectory: values['archive-directory'], authorization: values.authorization })
    .then(receipt => process.stdout.write(JSON.stringify({ ...receipt, files: `${receipt.files.length} byte-pinned files` }) + '\n'))
    .catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
}
