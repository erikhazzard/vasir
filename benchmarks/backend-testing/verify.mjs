import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { copyFixture, filesIn, readJson, sha256, startServices, within, writeJson } from './fixture.mjs';

async function runSingleSpec({ fixture, workspace, testFile, outputDir, timeoutMs = 180000 }) {
  workspace = path.resolve(workspace);
  outputDir = path.resolve(outputDir);
  await fs.mkdir(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, 'mocha.json');
  const logPath = path.join(outputDir, 'process.log');
  const args = ['node_modules/mocha/bin/mocha.js', '--exit', '--reporter', 'json', '--reporter-option', `output=${reportPath}`, testFile];
  const started = Date.now();
  const chunks = [];
  let timedOut = false;
  let launchError;
  let cleanupError;
  let code;
  let services;
  try {
    if (process.platform !== 'darwin') throw new Error('Replay isolation requires macOS sandbox-exec');
    services = await startServices({ fixture, outputDir });
    const scratch = path.join(outputDir, 'scratch');
    await fs.mkdir(scratch, { recursive: true });
    const sandboxPath = path.join(outputDir, 'replay.sb');
    const profile = `(version 1)\n(allow default)\n(deny file-read* file-write*\n${[homedir(), '/private/tmp', '/private/var/folders'].map(root => ` (subpath ${JSON.stringify(root)})`).join('\n')}\n)\n(allow file-read-metadata (subpath "/"))\n(allow file-read* (subpath ${JSON.stringify(workspace)}) (subpath ${JSON.stringify(fixture.dependencyDir)}) (subpath ${JSON.stringify(path.resolve(path.dirname(process.execPath), '..'))}))\n(deny file-write* (subpath ${JSON.stringify(workspace)}) (subpath ${JSON.stringify(fixture.dependencyDir)}))\n(allow file-read* file-write* (subpath ${JSON.stringify(outputDir)}))\n(deny network*)\n(allow network* (remote ip "localhost:*") (local ip "localhost:*"))\n`;
    await fs.writeFile(sandboxPath, profile);
    const probeCode = `const fs=require('node:fs');const deny=fn=>{try{fn();throw Error('Unexpected access')}catch(error){if(!['EPERM','EACCES'].includes(error.code))throw error}};fs.readFileSync('package.json');fs.readFileSync('node_modules/mocha/package.json');deny(()=>fs.readFileSync(${JSON.stringify(fixture.privateConfigPath)}));deny(()=>fs.openSync('package.json','a'));deny(()=>fs.openSync('node_modules/mocha/package.json','a'));`;
    const probe = spawnSync('/usr/bin/sandbox-exec', ['-f', sandboxPath, process.execPath, '-e', probeCode], {
      cwd: workspace, env: { ...services.env, HOME: scratch, TMPDIR: scratch }, encoding: 'utf8', timeout: 5000 });
    await writeJson(path.join(outputDir, 'isolation.json'), { status: probe.status === 0 ? 'pass' : 'fail', stderr: probe.stderr, checks: ['source-readable', 'dependencies-readable', 'private-config-unreadable', 'source-readonly', 'dependencies-readonly'] });
    if (probe.status !== 0) throw new Error(`Replay isolation probe failed: ${probe.stderr}`);
    const child = spawn('/usr/bin/sandbox-exec', ['-f', sandboxPath, process.execPath, ...args], {
      cwd: workspace, env: { ...services.env, HOME: scratch, TMPDIR: scratch }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    child.stdout.on('data', data => chunks.push(data)); child.stderr.on('data', data => chunks.push(data));
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch {}
    }, timeoutMs);
    code = await new Promise(resolve => {
      child.once('error', error => { launchError = error.message; resolve(null); });
      child.once('close', resolve);
    });
    clearTimeout(timer);
  } catch (error) {
    launchError = error.stack || error.message;
    chunks.push(Buffer.from(`${launchError}\n`));
  } finally {
    try { await services?.close(); }
    catch (error) { cleanupError = error.stack || error.message; chunks.push(Buffer.from(`${cleanupError}\n`)); }
  }
  const elapsedMs = Date.now() - started;
  const processLog = Buffer.concat(chunks);
  await fs.writeFile(logPath, processLog);
  let report;
  try { report = await readJson(reportPath); } catch {}
  const failures = report?.failures || [];
  const assertions = await Promise.all(failures.filter(test => !/hook for|hook in/.test(test.title)
    && (test.err?.code === 'ERR_ASSERTION' || /AssertionError/.test(test.err?.name || test.err?.stack || '')))
    .map(async test => {
      const stack = test.err.stack || '';
      const match = stack.match(/(?:file:\/\/)?([^\s()]+\.js):(\d+):(\d+)/);
      let source;
      if (match && path.resolve(match[1]).startsWith(`${path.resolve(workspace)}${path.sep}`)) {
        try {
          const lines = (await fs.readFile(match[1], 'utf8')).split('\n');
          const line = Number(match[2]);
          source = { file: path.relative(workspace, match[1]), line, excerpt: lines.slice(Math.max(0, line - 3), line + 3).join('\n') };
        } catch { /* Preserve the assertion even when its diagnostic source is unavailable. */ }
      }
      return { fullTitle: test.fullTitle, file: test.file && path.relative(workspace, test.file),
        message: test.err.message, actual: test.err.actual, expected: test.err.expected, operator: test.err.operator, stack, source };
    }));
  const status = launchError || cleanupError ? 'infrastructure-failure' : timedOut ? 'timeout'
    : code === 0 && report?.stats?.passes > 0 && report?.stats?.pending === 0 && failures.length === 0 ? 'pass'
      : report && failures.length > 0 && assertions.length === failures.length ? 'assertion-failure'
        : services && !launchError ? 'execution-failure' : 'infrastructure-failure';
  const cleanupFailures = failures.filter(test => /["']after (?:all|each)["'] hook/.test(test.title));
  const testFailures = failures.filter(test => !cleanupFailures.includes(test));
  const testStatus = launchError ? 'infrastructure-failure' : timedOut ? 'timeout'
    : report?.stats?.passes > 0 && report?.stats?.pending === 0 && testFailures.length === 0 && (code === 0 || cleanupFailures.length > 0) ? 'pass'
      : testFailures.length > 0 && assertions.length === testFailures.length ? 'assertion-failure' : 'execution-failure';
  // The shared server harness can catch these shutdown errors, so a zero process exit is insufficient cleanup evidence.
  const cleanupDiagnostics = processLog.toString('utf8').split('\n').filter(line => /\[error:[^\]]+\].*(?:ws_gateway_close_failed|place_authority_gateway_admission_generation_terminal_failed)/.test(line));
  const cleanupStatus = cleanupError || cleanupFailures.length || cleanupDiagnostics.length ? 'failed' : services ? 'pass' : 'not-run';
  const result = { status, testStatus, cleanupStatus, cleanupError, cleanupDiagnostics, cleanupFailures: cleanupFailures.map(test => ({ fullTitle: test.fullTitle, message: test.err?.message, stack: test.err?.stack })), elapsedMs, code, timedOut, launchError, logPath, reportPath,
    stats: report?.stats, passedTests: (report?.passes || []).map(test => test.fullTitle), assertions,
    passedCases: (report?.passes || []).map(test => ({ fullTitle: test.fullTitle, file: test.file && path.relative(workspace, test.file) })),
    command: [process.execPath, ...args], ports: services?.ports };
  await writeJson(path.join(outputDir, 'result.json'), result);
  return result;
}

export async function runTests(options) {
  const { testFiles, outputDir } = options;
  if (!testFiles.length) throw new Error('Replay requires at least one spec');
  if (testFiles.length === 1) return runSingleSpec({ ...options, testFile: testFiles[0] });
  const specRuns = [];
  for (const [index, testFile] of testFiles.entries()) {
    specRuns.push({ testFile, ...await runSingleSpec({ ...options, testFile,
      outputDir: path.join(outputDir, `spec-${String(index + 1).padStart(3, '0')}`) }) });
  }
  const status = ['infrastructure-failure', 'timeout', 'execution-failure', 'assertion-failure', 'pass']
    .find(candidate => specRuns.some(run => run.status === candidate));
  const testStatus = ['infrastructure-failure', 'timeout', 'execution-failure', 'assertion-failure', 'pass']
    .find(candidate => specRuns.some(run => run.testStatus === candidate));
  const cleanupStatus = specRuns.some(run => run.cleanupStatus === 'failed') ? 'failed' : specRuns.every(run => run.cleanupStatus === 'pass') ? 'pass' : 'not-run';
  const result = { status, testStatus, cleanupStatus, cleanupFailures: specRuns.flatMap(run => run.cleanupFailures), cleanupDiagnostics: specRuns.flatMap(run => run.cleanupDiagnostics), elapsedMs: specRuns.reduce((total, run) => total + run.elapsedMs, 0),
    stats: Object.fromEntries(['suites', 'tests', 'passes', 'pending', 'failures', 'duration'].map(key =>
      [key, specRuns.reduce((total, run) => total + (run.stats?.[key] || 0), 0)])),
    passedTests: specRuns.flatMap(run => run.passedTests), passedCases: specRuns.flatMap(run => run.passedCases),
    assertions: specRuns.flatMap(run => run.assertions), specRuns };
  await writeJson(path.join(path.resolve(outputDir), 'result.json'), result);
  return result;
}

async function applyFault(workspace, fault) {
  for (const replacement of fault.replacements) {
    const file = within(workspace, replacement.file);
    const original = await fs.readFile(file, 'utf8');
    if (original.split(replacement.before).length !== 2) throw new Error(`Fault ${fault.id} anchor must occur exactly once`);
    await fs.writeFile(file, original.replace(replacement.before, replacement.after));
  }
}
async function installSubmission({ fixture, submissionDir, workspace }) {
  const files = await filesIn(submissionDir);
  if (!files.length) throw new Error('Submission has no files');
  for (const file of files) {
    if (!file.startsWith(fixture.submissionPrefix) || !file.endsWith('.js') || file in fixture.fileHashes) {
      throw new Error(`Submission changes disallowed path: ${file}`);
    }
    const destination = within(workspace, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(within(submissionDir, file), destination);
  }
  const testFiles = files.filter(file => file.endsWith('.spec.js'));
  if (!testFiles.length) throw new Error('Submission has no executable spec');
  return testFiles;
}
export async function evaluateSubmission({ fixture, submissionDir, outputDir, rowId }) {
  outputDir = path.resolve(outputDir);
  submissionDir = path.resolve(submissionDir);
  const config = await readJson(fixture.privateConfigPath);
  const workspace = path.join(outputDir, 'workspace');
  await copyFixture({ fixture, destination: workspace });
  let testFiles;
  try { testFiles = await installSubmission({ fixture, submissionDir, workspace }); }
  catch (error) {
    const result = { rowId, status: 'invalid', reason: error.message, controlRuns: [], faultRuns: [] };
    await writeJson(path.join(outputDir, 'evaluation.json'), result);
    return result;
  }
  const controlRuns = [];
  for (let repeat = 1; repeat <= 2; repeat++) {
    controlRuns.push(await runTests({ fixture, workspace, testFiles, outputDir: path.join(outputDir, `control-${repeat}`) }));
  }
  const controlsPass = controlRuns.every(run => run.status === 'pass');
  const faultRuns = [];
  if (controlsPass) {
    for (const fault of config.faults) {
      const originals = await Promise.all(fault.replacements.map(async replacement => [replacement.file, await fs.readFile(within(workspace, replacement.file))]));
      try {
        await applyFault(workspace, fault);
        const run = await runTests({ fixture, workspace, testFiles, outputDir: path.join(outputDir, fault.id) });
        const matchedAssertions = run.assertions.filter(assertion => controlRuns.every(control => control.passedCases.some(test =>
          test.fullTitle === assertion.fullTitle && test.file === assertion.file)));
        faultRuns.push({ ...run, faultId: fault.id, executionStatus: run.status, reviewStatus: 'pending',
          status: ['infrastructure-failure', 'timeout'].includes(run.status) ? 'unresolved' : run.status === 'pass' ? 'survived'
          : run.status === 'assertion-failure' && matchedAssertions.length === run.assertions.length && matchedAssertions.length > 0 ? 'candidate-detection' : 'invalid' });
      } finally {
        for (const [file, contents] of originals) await fs.writeFile(within(workspace, file), contents);
      }
    }
  }
  const operationallyUnresolved = controlRuns.some(run => ['infrastructure-failure', 'timeout'].includes(run.status))
    || faultRuns.some(run => run.status === 'unresolved');
  const result = { rowId, status: operationallyUnresolved ? 'unresolved' : controlsPass ? 'valid' : 'invalid', controlRuns, faultRuns };
  await writeJson(path.join(outputDir, 'evaluation.json'), result);
  return result;
}

export async function installQualitySubmission({ fixture, submissionDir, workspace }) {
  const files = await filesIn(submissionDir);
  for (const file of files) {
    if (!file.startsWith(fixture.submissionPrefix) || !/\.(js|md)$/.test(file)) throw new Error(`Submission changes disallowed path: ${file}`);
  }
  const testFiles = files.filter(file => file.endsWith('.spec.js'));
  if (!testFiles.length) throw new Error('Submission removed every executable spec');
  // A complete final suite snapshot replaces only the writable original .js/.md surface.
  for (const file of Object.keys(fixture.fileHashes).filter(file => file.startsWith(fixture.submissionPrefix) && /\.(js|md)$/.test(file))) await fs.rm(within(workspace, file));
  for (const file of files) {
    const destination = within(workspace, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(within(submissionDir, file), destination);
  }
  return testFiles;
}

export function anonymousJudgeEvidence(result) {
  const redact = value => {
    if (typeof value === 'string') return value.replace(/(?:file:\/\/)?\/(?:Users|private|tmp|var|home)\/[^\s"'<>)]*/g, '<private-path>');
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]));
    return value;
  };
  const execution = run => ({ status: run.status, testStatus: run.testStatus, cleanupStatus: run.cleanupStatus,
    stats: run.stats && Object.fromEntries(['suites', 'tests', 'passes', 'pending', 'failures', 'duration'].map(key => [key, run.stats[key]])),
    passedCases: run.passedCases, assertions: (run.assertions ?? []).map(({ file, fullTitle, message, actual, expected, operator, source }) => ({ file, fullTitle, message, actual, expected, operator, source })),
    cleanupFailures: (run.cleanupFailures ?? []).map(({ fullTitle, message }) => ({ fullTitle, message })), cleanupDiagnostics: run.cleanupDiagnostics,
    commands: run.specRuns ? run.specRuns.map(spec => ['node', 'node_modules/mocha/bin/mocha.js', '--exit', spec.testFile]) : undefined });
  return redact({ schemaVersion: 2, artifactFiles: result.artifactFiles ?? [], status: result.status, testStatus: result.testStatus, cleanupStatus: result.cleanupStatus,
    behavioralEvidenceObserved: result.controlRuns.some(run => (run.passedCases?.length ?? 0) + (run.assertions?.length ?? 0) > 0),
    infrastructureUnresolved: result.status === 'unresolved' || result.controlRuns.some(run => ['infrastructure-failure', 'timeout'].includes(run.testStatus)),
    controls: result.controlRuns.map(execution),
    supportingFaults: result.faultRuns.map(run => ({ ...execution(run), essential: run.essential, executionStatus: run.executionStatus, reviewStatus: run.reviewStatus })),
    essentialProtection: result.essentialProtection?.status,
    commands: (result.testFiles ?? []).map(file => ['node', 'node_modules/mocha/bin/mocha.js', '--exit', file]) });
}

export async function evaluateQualitySubmission({ fixture, submissionDir, outputDir, rowId, caseId }) {
  outputDir = path.resolve(outputDir);
  submissionDir = path.resolve(submissionDir);
  const evaluatorSha256 = sha256(await fs.readFile(new URL(import.meta.url)));
  const config = await readJson(fixture.privateConfigPath), workspace = path.join(outputDir, 'workspace');
  const artifactFiles = await Promise.all((await filesIn(submissionDir)).filter(file => /\.(?:js|cjs|mjs|json)$/.test(file)).map(async file => ({ path: file, sha256: sha256(await fs.readFile(within(submissionDir, file))) })));
  await copyFixture({ fixture, destination: workspace });
  let testFiles;
  try { testFiles = await installQualitySubmission({ fixture, submissionDir, workspace }); }
  catch (error) {
    const result = { schemaVersion: 2, caseId, rowId, evaluatorSha256, artifactFiles, status: 'invalid', testStatus: 'not-run', cleanupStatus: 'not-run', reason: error.message, controlRuns: [], faultRuns: [], essentialProtection: { status: 'lost', reason: error.message }, supportingFaultEvidence: true };
    result.judgeEvidence = anonymousJudgeEvidence(result);
    await writeJson(path.join(outputDir, 'evaluation.json'), result);
    return result;
  }
  const controlRuns = [];
  for (let repeat = 1; repeat <= 2; repeat++) controlRuns.push(await runTests({ fixture, workspace, testFiles, outputDir: path.join(outputDir, `control-${repeat}`) }));
  const controlsPass = controlRuns.every(run => run.testStatus === 'pass');
  const faultRuns = [];
  if (controlsPass) for (const fault of config.faults) {
    const originals = await Promise.all([...new Set(fault.replacements.map(replacement => replacement.file))].map(async file => [file, await fs.readFile(within(workspace, file))]));
    try {
      await applyFault(workspace, fault);
      const run = await runTests({ fixture, workspace, testFiles, outputDir: path.join(outputDir, fault.id) });
      const matchedAssertions = run.assertions.filter(assertion => controlRuns.every(control => control.passedCases.some(test => test.fullTitle === assertion.fullTitle && test.file === assertion.file)));
      faultRuns.push({ ...run, faultId: fault.id, essential: fault.essential === true, executionStatus: run.testStatus, overallExecutionStatus: run.status, reviewStatus: 'pending',
        status: ['infrastructure-failure', 'timeout'].includes(run.testStatus) ? 'unresolved' : run.testStatus === 'pass' ? 'survived'
          : run.testStatus === 'assertion-failure' && matchedAssertions.length === run.assertions.length && matchedAssertions.length > 0 ? 'candidate-detection' : 'invalid' });
    } finally { for (const [file, contents] of originals) await fs.writeFile(within(workspace, file), contents); }
  }
  const unresolved = controlRuns.some(run => ['infrastructure-failure', 'timeout'].includes(run.testStatus)) || faultRuns.some(run => run.status === 'unresolved');
  const essential = faultRuns.filter(run => run.essential);
  const essentialProtection = { status: !controlsPass ? 'unresolved' : essential.some(run => run.status === 'survived') ? 'lost'
    : essential.some(run => ['unresolved', 'invalid'].includes(run.status)) ? 'unresolved' : 'pending-review',
    faultIds: config.faults.filter(fault => fault.essential === true).map(fault => fault.id), survivedFaultIds: essential.filter(run => run.status === 'survived').map(run => run.faultId) };
  const result = { schemaVersion: 2, caseId, rowId, evaluatorSha256, artifactFiles, status: unresolved ? 'unresolved' : controlsPass ? 'valid' : 'invalid',
    testStatus: controlsPass ? 'pass' : controlRuns.find(run => run.testStatus !== 'pass')?.testStatus,
    cleanupStatus: controlRuns.some(run => run.cleanupStatus === 'failed') ? 'failed' : controlRuns.every(run => run.cleanupStatus === 'pass') ? 'pass' : 'not-run',
    testFiles, controlRuns, faultRuns, essentialProtection, supportingFaultEvidence: true };
  result.judgeEvidence = anonymousJudgeEvidence(result);
  await writeJson(path.join(outputDir, 'evaluation.json'), result);
  return result;
}

export async function calibrateQuality({ fixture, outputDir, caseId }) {
  outputDir = path.resolve(outputDir);
  const config = await readJson(fixture.privateConfigPath), submissionDir = path.join(outputDir, 'gold-submission');
  await fs.mkdir(submissionDir, { recursive: true });
  for (const file of Object.keys(fixture.fileHashes).filter(file => file.startsWith(fixture.submissionPrefix) && /\.(js|md)$/.test(file))) {
    const destination = within(submissionDir, file); await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.copyFile(within(fixture.sourceDir, file), destination);
  }
  for (const file of config.goldDeletedFiles ?? []) {
    if (!file.startsWith(fixture.submissionPrefix) || !/\.(js|md)$/.test(file)) throw new Error(`Invalid gold deletion: ${file}`);
    await fs.rm(within(submissionDir, file));
  }
  for (const gold of config.gold ?? []) { const destination = within(submissionDir, gold.destination); await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.copyFile(gold.source, destination); }
  const result = await evaluateQualitySubmission({ fixture, submissionDir, outputDir: path.join(outputDir, 'gold'), rowId: 'calibration-gold', caseId });
  const restored = result.status === 'valid' ? await runTests({ fixture, workspace: path.join(outputDir, 'gold/workspace'), testFiles: result.testFiles, outputDir: path.join(outputDir, 'restored') }) : null;
  const executionsValid = result.status === 'valid' && restored?.testStatus === 'pass' && result.faultRuns.length === config.faults.length && result.faultRuns.every(run => run.status === 'candidate-detection');
  const calibration = { schemaVersion: 2, caseId, sourceHash: fixture.sourceHash, valid: false, executionsValid, reviewStatus: 'pending', result, restored,
    faults: config.faults.map(fault => ({ id: fault.id, label: fault.label, essential: fault.essential === true, calibrated: false, sha256: sha256(JSON.stringify(fault)) })) };
  await writeJson(path.join(outputDir, 'calibration.json'), calibration);
  return calibration;
}

export async function calibrate({ fixture, outputDir }) {
  outputDir = path.resolve(outputDir);
  const config = await readJson(fixture.privateConfigPath);
  const submissionDir = path.join(outputDir, 'gold-submission');
  for (const gold of config.gold) {
    const destination = within(submissionDir, gold.destination);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(gold.source, destination);
  }
  const result = await evaluateSubmission({ fixture, submissionDir, outputDir: path.join(outputDir, 'gold'), rowId: 'calibration-gold' });
  const restored = result.status === 'valid' ? await runTests({ fixture, workspace: path.join(outputDir, 'gold', 'workspace'),
    testFiles: config.gold.map(gold => gold.destination), outputDir: path.join(outputDir, 'restored') }) : null;
  const executionsValid = result.status === 'valid' && restored?.status === 'pass' && result.faultRuns.length === config.faults.length
    && result.faultRuns.every(run => run.status === 'candidate-detection');
  const calibration = { schemaVersion: 1, sourceHash: fixture.sourceHash, valid: false, executionsValid, reviewStatus: 'pending', result, restored,
    faults: config.faults.map(fault => ({ id: fault.id, label: fault.label, calibrated: false, sha256: sha256(JSON.stringify(fault)) })) };
  await writeJson(path.join(outputDir, 'calibration.json'), calibration);
  return calibration;
}

export async function evaluateBatch({ runPath, calibrationPath, outputDir, concurrency = 4 }) {
  runPath = path.resolve(runPath);
  outputDir = path.resolve(outputDir);
  const run = await readJson(runPath);
  const plan = await readJson(run.planPath);
  const quality = run.schemaVersion === 2;
  const evaluatorSha256 = sha256(await fs.readFile(new URL(import.meta.url)));
  if (quality && plan.basis.verifierSha256 !== evaluatorSha256) throw new Error('Verifier changed after generation preparation');
  const cases = quality ? plan.cases : [{ id: 'pilot', fixturePath: plan.fixturePath, calibrationPath }];
  const inputs = new Map();
  for (const item of cases) {
    const fixture = await readJson(item.fixturePath), calibrationBytes = await fs.readFile(item.calibrationPath), calibration = JSON.parse(calibrationBytes);
    if (!calibration.valid || calibration.reviewStatus !== 'approved' || calibration.sourceHash !== fixture.sourceHash) throw new Error('Generation evaluation requires reviewed calibration for the exact fixture');
    if (quality && sha256(calibrationBytes) !== item.basis.calibrationSha256) throw new Error('Frozen approved calibration changed');
    const config = await readJson(fixture.privateConfigPath);
    if (config.faults.some(fault => !calibration.faults.some(entry => entry.id === fault.id && entry.calibrated
      && entry.reviewStatus === 'approved' && entry.sha256 === sha256(JSON.stringify(fault))))) throw new Error('Calibrated fault definitions changed');
    const actualSourceFiles = await filesIn(fixture.sourceDir);
    if (JSON.stringify(actualSourceFiles) !== JSON.stringify(Object.keys(fixture.fileHashes).sort())) throw new Error('Frozen source inventory changed');
    for (const [file, digest] of Object.entries(fixture.fileHashes)) if (sha256(await fs.readFile(within(fixture.sourceDir, file))) !== digest) throw new Error(`Frozen source changed: ${file}`);
    inputs.set(item.id, { fixture, calibration, calibrationSha256: sha256(calibrationBytes) });
  }
  const rows = new Array(run.rows.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, run.rows.length) }, async () => {
    while (next < run.rows.length) {
      const index = next++;
      const row = run.rows[index];
      const { fixture } = inputs.get(row.caseId ?? 'pilot');
      const destination = path.join(outputDir, row.rowId);
      let result;
      if (quality && !['eligible', 'task-invalid', 'unresolved'].includes(row.qualityEligibility?.status)) throw new Error('Generation receipt omitted quality eligibility');
      if (row.submission.forbiddenChanges.length || (quality ? row.qualityEligibility.status !== 'eligible' : row.status !== 'complete')) {
        result = { rowId: row.rowId, status: quality && row.qualityEligibility.status === 'unresolved' && !row.submission.forbiddenChanges.length ? 'unresolved' : 'invalid',
          reason: quality ? row.qualityEligibility.reason : `Generation ${row.status}; forbidden changes ${row.submission.forbiddenChanges.length}`, controlRuns: [], faultRuns: [] };
      } else {
        try {
          const actualFiles = await filesIn(row.submission.directory);
          if (JSON.stringify(actualFiles) !== JSON.stringify(row.submission.files.map(file => file.path).sort())) throw new Error('Frozen submission file inventory changed');
          for (const file of row.submission.files) {
            if (sha256(await fs.readFile(within(row.submission.directory, file.path))) !== file.sha256) throw new Error(`Frozen submission changed: ${file.path}`);
          }
          result = await (quality ? evaluateQualitySubmission : evaluateSubmission)({ fixture, submissionDir: row.submission.directory, outputDir: destination, rowId: row.rowId, caseId: row.caseId });
        } catch (error) {
          result = { rowId: row.rowId, status: 'unresolved', reason: error.stack || error.message, controlRuns: [], faultRuns: [] };
        }
      }
      if (quality) {
        Object.assign(result, { schemaVersion: 2, caseId: row.caseId, evaluatorSha256, testStatus: result.testStatus ?? 'not-run', cleanupStatus: result.cleanupStatus ?? 'not-run' });
        if (!result.artifactFiles) result.artifactFiles = await Promise.all((await filesIn(row.submission.directory)).filter(file => /\.(?:js|cjs|mjs|json)$/.test(file)).map(async file => ({ path: file, sha256: sha256(await fs.readFile(within(row.submission.directory, file))) })));
        result.judgeEvidence = anonymousJudgeEvidence(result);
      }
      await writeJson(path.join(destination, 'evaluation.json'), result);
      rows[index] = result;
      process.stdout.write(`${JSON.stringify({ rowId: row.rowId, status: result.status, faults: result.faultRuns.map(fault => ({ faultId: fault.faultId, status: fault.status })) })}\n`);
    }
  }));
  const input = inputs.values().next().value;
  const evaluation = { schemaVersion: quality ? 2 : 1, benchmark: run.benchmark, runId: run.runId,
    basis: { ...(quality ? { cases: [...inputs.entries()].map(([id, value]) => ({ id, sourceHash: value.fixture.sourceHash, calibrationSha256: value.calibrationSha256 })), rubricSha256: plan.basis.rubricSha256 }
      : { sourceHash: input.fixture.sourceHash, calibrationSha256: input.calibrationSha256 }), runSha256: sha256(await fs.readFile(runPath)), evaluatorSha256: sha256(await fs.readFile(new URL(import.meta.url))) },
    ...(quality ? { supportingFaultEvidence: true, cases: [...inputs.entries()].map(([id, value]) => ({ id, faults: value.calibration.faults })) } : { faults: input.calibration.faults }), rows };
  await writeJson(path.join(outputDir, 'evaluation.json'), evaluation);
  return evaluation;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command, manifestPath, outputDir, submissionDir] = process.argv.slice(2);
  if (!command || !manifestPath || !outputDir) console.log('Usage: node benchmarks/backend-testing/verify.mjs calibrate|quality-calibrate <fixture.json> <new-output-dir>\n       node benchmarks/backend-testing/verify.mjs submission|quality-submission <fixture.json> <new-output-dir> <submission-dir>\n       node benchmarks/backend-testing/verify.mjs batch <run.json> <new-output-dir> <reviewed-calibration.json>\n       node benchmarks/backend-testing/verify.mjs quality-batch <run.json> <new-output-dir>');
  else {
    if (!['batch', 'quality-batch', 'calibrate', 'quality-calibrate', 'submission', 'quality-submission'].includes(command)) throw new Error(`Unknown verifier command: ${command}`);
    const batch = ['batch', 'quality-batch'].includes(command), fixture = batch ? null : await readJson(manifestPath);
    const result = batch ? await evaluateBatch({ runPath: manifestPath, outputDir, calibrationPath: submissionDir })
      : command === 'quality-calibrate' ? await calibrateQuality({ fixture, outputDir, caseId: fixture.caseId })
        : command === 'calibrate' ? await calibrate({ fixture, outputDir })
          : await (command === 'quality-submission' ? evaluateQualitySubmission : evaluateSubmission)({ fixture, outputDir, submissionDir, rowId: path.basename(outputDir), caseId: fixture.caseId });
    console.log(JSON.stringify({ valid: result.valid, status: result.status, outputDir }));
    if (result.valid === false || result.status === 'invalid') process.exitCode = 1;
  }
}
