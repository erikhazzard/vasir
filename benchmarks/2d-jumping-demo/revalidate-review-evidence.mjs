// Offline correction of two observed validation errors. Never calls a model or edits its answer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, realpath, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGameJudgeInspection, validateGameJudgeOutput, validateGameReviewSkillIsolation } from './judge-games.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = value => `${JSON.stringify(value, null, 2)}\n`;
const rules = { 'Game judge: review read outside supplied evidence': 'native-failed-evidence-lookup-v1', 'Game judge: rating cites unknown evidence': 'native-captured-evidence-alias-v1' };

export async function revalidateReviewEvidence({ planPath, seatId, originalRunnerPath, outputDirectory, repoRootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..') }) {
  const pin = async file => { const bytes = await readFile(file); return { path: relative(repoRootDirectory, file), bytes: bytes.length, sha256: sha(bytes) }; };
  const read = async file => JSON.parse(await readFile(file, 'utf8'));
  const plan = await read(planPath), seat = plan.seats.find(seat => seat.id === seatId);
  assert.equal(plan.kind, 'vasir-game-judge-plan'); assert.equal(plan.executionEligible, true);
  assert.equal(seat?.judgeId, 'claude:claude-fable-5-1@max');
  const resultPath = join(seat.history, 'result.json'), original = await read(resultPath), rule = rules[original.error];
  assert.equal(original.status, 'failed'); assert(rule, 'Unrelated validation failure');
  assert.equal(original.reviewRunId, plan.reviewRunId); assert.equal(original.judgeId, seat.judgeId);
  assert.equal(original.exitCode, 0); assert.equal(original.timedOut, false); assert.equal(original.outputLimitExceeded, false);
  assert(Number.isFinite(original.elapsedMs) && original.elapsedMs > 0 && original.elapsedMs <= plan.timeoutMs, 'Unfinished native review cannot be amended');
  assert.equal((await pin(originalRunnerPath)).sha256, plan.runnerSha256, 'Original runner snapshot differs from the frozen plan');
  assert.equal((await pin(join(dirname(fileURLToPath(import.meta.url)), 'judge-games.mjs'))).sha256, plan.runnerSha256, 'This narrow correction requires the otherwise unchanged runner');
  const stdoutPath = join(seat.history, 'stdout.jsonl'), auditPath = join(seat.history, 'browser-audit.jsonl'), requestsPath = join(seat.history, 'requests.json'), basisPath = join(seat.history, 'input-basis.json');
  const stdout = await readFile(stdoutPath, 'utf8'), events = stdout.trim().split('\n').map(JSON.parse), blocks = events.flatMap(event => event.message?.content ?? []), calls = blocks.filter(block => block.type === 'tool_use'), results = blocks.filter(block => block.type === 'tool_result');
  const final = events.findLast(event => event.type === 'result');
  assert.equal(final?.subtype, 'success'); assert.equal(final.is_error, false);
  assert(Object.keys(final.modelUsage ?? {}).length && Object.keys(final.modelUsage).every(model => ['claude-fable-5-1', 'claude-haiku-4-5'].includes(model)), 'Unexpected native model usage');
  const structured = final.structured_output, delivered = calls.filter(call => call.name === 'StructuredOutput').at(-1);
  assert(structured && delivered); assert.deepEqual(structured, delivered.input, 'Native structured outputs disagree');
  const candidates = structuredClone(seat.candidates), failedEvidenceLookups = [], ignored = new Set(), supplemental = [];
  if (rule === 'native-failed-evidence-lookup-v1') {
    const roots = [seat.workspace, join(seat.root, 'browser-output')];
    const canonical = await Promise.all(roots.map(root => realpath(root)));
    const outside = calls.filter(call => call.name === 'Read' && ![...roots, ...canonical].some(root => resolve(seat.workspace, call.input.file_path).startsWith(`${root}${sep}`)));
    assert.equal(outside.length, 1, 'Only the observed single failed evidence lookup is admissible');
    const call = outside[0], attemptedPath = resolve(seat.workspace, call.input.file_path), response = results.find(result => result.tool_use_id === call.id);
    const candidate = seat.candidates.find(candidate => candidate.media.some(media => media.type === 'image' && attemptedPath === join(seat.root, media.path)));
    const media = candidate?.media.find(media => attemptedPath === join(seat.root, media.path));
    assert(candidate && media, 'Lookup was not a declared image under the owned seat');
    assert.equal(response?.is_error, true); assert.equal(typeof response.content, 'string'); assert.match(response.content, /^File does not exist\./);
    await assert.rejects(realpath(attemptedPath), { code: 'ENOENT' });
    ignored.add(call.id);
    failedEvidenceLookups.push({ toolUseId: call.id, attemptedPath, candidateId: candidate.id, mediaId: media.id, deliveredBytes: 0 });
  }
  const isolationEvents = events.map(event => event.message?.content ? { ...event, message: { ...event.message, content: event.message.content.filter(block => !(block.type === 'tool_use' && ignored.has(block.id)) && !(block.type === 'tool_result' && ignored.has(block.tool_use_id))) } } : event);
  const checks = { ...await validateGameReviewSkillIsolation({ seat, events: isolationEvents }), failedEvidenceLookups, outputUnchanged: true, originalRunnerSha256: plan.runnerSha256, structuredOutputSha256: sha(JSON.stringify(structured)) };
  const output = resolve(outputDirectory); await mkdir(output, { recursive: true, mode: 0o700 });
  if (rule === 'native-captured-evidence-alias-v1') {
    const unknown = structured.candidates.flatMap(answer => {
      const candidate = candidates.find(candidate => candidate.id === answer.id);
      return answer.evaluation.dimensions.flatMap(dimension => dimension.evidence.filter(evidence => evidence.mediaId !== candidate.liveId && !candidate.media.some(media => media.id === evidence.mediaId)).map(evidence => ({ candidate, evidence })));
    });
    assert.equal(unknown.length, 1, 'Only one actually captured live-image alias is admissible');
    const { candidate, evidence } = unknown[0]; assert.equal(evidence.atSeconds, null); assert.equal(candidate.hasRuntime, true);
    assert(new RegExp(`^${candidate.id}-[a-z][a-z0-9-]{1,40}$`).test(evidence.mediaId));
    const filename = `${evidence.mediaId}.png`, file = join(seat.workspace, filename);
    assert((await realpath(file)).startsWith(`${await realpath(seat.workspace)}${sep}`));
    const readCall = calls.find(call => call.name === 'Read' && resolve(seat.workspace, call.input.file_path) === file), readResult = results.find(result => result.tool_use_id === readCall?.id);
    assert(readCall && readResult && !readResult.is_error && Array.isArray(readResult.content));
    const images = readResult.content.filter(content => content.type === 'image'); assert.equal(images.length, 1); assert.equal(images[0].source?.type, 'base64');
    const sourceBytes = await readFile(file), deliveredBytes = Buffer.from(images[0].source.data, 'base64'); assert.equal(sha(sourceBytes), sha(deliveredBytes), 'Cited live image differs from the delivered image');
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), capturePattern = new RegExp(`page\\.screenshot\\(\\s*\\{\\s*path:\\s*(['\"])${escaped}\\1`);
    const captureCall = calls.find(call => call.name.endsWith('browser_run_code_unsafe') && capturePattern.test(call.input.code ?? ''));
    assert(captureCall && calls.indexOf(captureCall) < calls.indexOf(readCall), 'Named image was not captured before it was read');
    const captureResult = results.find(result => result.tool_use_id === captureCall.id); assert(captureResult && !captureResult.is_error);
    const beforeCapture = calls.slice(0, calls.indexOf(captureCall)), navigation = beforeCapture.findLast(call => call.name.endsWith('browser_navigate'));
    assert(navigation && new URL(navigation.input.url).pathname === `/${candidate.id}/index.html`, 'Live screenshot candidate was not established by navigation');
    assert(!beforeCapture.slice(beforeCapture.indexOf(navigation) + 1).some(call => call.name.endsWith('browser_tabs') || /\.goto\(|\.setContent\(|\.newPage\(/.test(call.input?.code ?? '')), 'Live screenshot candidate changed after navigation');
    const retained = join(output, filename); await copyFile(file, retained, 1);
    supplemental.push({ id: evidence.mediaId, candidateId: candidate.id, type: 'image', atSeconds: null, image: await pin(retained), readToolUseId: readCall.id, captureToolUseId: captureCall.id, sourceSha256: sha(sourceBytes), deliveredSha256: sha(deliveredBytes) });
    candidate.media.push({ id: evidence.mediaId, type: 'image', atSeconds: null, path: filename });
  }
  const audit = (await readFile(auditPath, 'utf8')).trim().split('\n').map(JSON.parse), inspection = await validateGameJudgeInspection({ seat, stdout, audit });
  const assessments = validateGameJudgeOutput(structured, { candidates, rubric: plan.rubric });
  const requests = await read(requestsPath), basis = await read(basisPath);
  assert.equal(basis.runnerSha256, plan.runnerSha256); assert.equal(basis.rubricSha256, plan.rubricSha256);
  for (const candidate of seat.candidates) {
    if (candidate.hasRuntime) assert(requests.some(request => request.path === `/${candidate.id}/index.html`));
    if (candidate.media.length) assert(requests.some(request => candidate.media.some(media => request.path === `/${media.path}`)));
  }
  for (const file of seat.files) { const bytes = await readFile(join(seat.serverRoot, file.path)); assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256); }
  for (const source of plan.sourcePins) { const bytes = await readFile(join(source.root, source.path)); assert.equal(bytes.length, source.bytes); assert.equal(sha(bytes), source.sha256); }
  const receipt = { kind: 'vasir-game-judge-amended-validation', schemaVersion: 1, rule, reviewRunId: plan.reviewRunId, judgeId: seat.judgeId, seatId, originalStatus: original.status, status: 'completed', reviewPlan: await pin(planPath), originalResult: await pin(resultPath), inputs: await Promise.all([stdoutPath, auditPath, requestsPath, basisPath, originalRunnerPath, fileURLToPath(import.meta.url)].map(pin)), checks, inspection, supplementalLiveEvidence: supplemental, outputs: [], note: 'Completed native output is unchanged. Original validation rejection and the exact failed lookup or captured live-image evidence are retained.' };
  for (const assessment of assessments) {
    const mapping = seat.mappings.find(mapping => mapping.id === assessment.id);
    assert.deepEqual(assessment.evaluation, structured.candidates.find(answer => answer.id === assessment.id).evaluation);
    const wrapper = { kind: 'vasir-game-judgment', schemaVersion: 1, reviewRunId: plan.reviewRunId, judgeId: seat.judgeId, status: 'completed', artifactHash: mapping.artifactHash, inspection: { status: 'passed', method: 'fresh-browser-and-sampled-media-review', promptSha256: basis.promptSha256, rubricSha256: plan.rubricSha256 }, evaluation: assessment.evaluation };
    const file = join(output, `${mapping.rowId}.json`); await writeFile(file, encode(wrapper), { flag: 'wx', mode: 0o600 });
    receipt.outputs.push({ rowId: mapping.rowId, path: file, sha256: sha(encode(wrapper)), total: assessment.total });
  }
  const receiptPath = join(output, 'validation.json'); await writeFile(receiptPath, encode(receipt), { flag: 'wx', mode: 0o600 });
  return { receiptPath, status: receipt.status, originalStatus: original.status, outputs: receipt.outputs };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [planPath, seatId, originalRunnerPath, outputDirectory] = process.argv.slice(2);
  assert(planPath && seatId && originalRunnerPath && outputDirectory, 'Usage: revalidate-review-evidence.mjs <plan> <seat> <original-runner-snapshot> <output-dir>');
  process.stdout.write(encode(await revalidateReviewEvidence({ planPath: resolve(planPath), seatId, originalRunnerPath: resolve(originalRunnerPath), outputDirectory: resolve(outputDirectory) })));
}
