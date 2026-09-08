// Offline validation only. Never launches, prompts, retries, or edits a reviewer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGameJudgeInspection, validateGameJudgeOutput } from './judge-games.mjs';

export const NATIVE_ADVERTISED_SKILLS = ['deep-research', 'dataviz', 'update-config', 'verify', 'debug', 'code-review', 'simplify', 'batch', 'fewer-permission-prompts', 'doctor', 'loop', 'schedule', 'claude-api', 'workflow-authoring', 'run', 'run-skill-generator'];
const RULE = 'native-skill-advertisement-v1';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = value => `${JSON.stringify(value, null, 2)}\n`;
const eventsFrom = stdout => stdout.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });

export async function validateNativeSkillAdvertisement({ seat, events }) {
  const init = events.find(event => event.type === 'system' && event.subtype === 'init');
  assert.equal(init?.model, 'claude-fable-5-1', 'Unexpected native review model');
  assert.deepEqual(init.skills, NATIVE_ADVERTISED_SKILLS, 'Unexpected advertised skill metadata');
  assert.deepEqual(init.plugins, [], 'Native review loaded plugins');
  assert(!init.tools.some(name => /^(Skill|Agent|Task|Workflow|SendMessage|TeamCreate|TeamDelete|Bash|Edit|Write|WebFetch|WebSearch)$/.test(name)), 'Forbidden native review tool was available');
  const calls = events.flatMap(event => (event.message?.content ?? []).filter(block => block.type === 'tool_use'));
  assert(calls.every(call => call.name === 'Read' || call.name === 'StructuredOutput' || call.name.startsWith('mcp__browser__browser_')), 'Review invoked a skill or unexpected tool');
  const root = await realpath(seat.root), readPaths = [];
  for (const call of calls.filter(call => call.name === 'Read')) {
    const file = resolve(seat.workspace, call.input.file_path);
    assert(file.startsWith(`${root}${sep}`) && extname(file) === '.png', 'Read did not target an isolated screenshot');
    try { assert((await realpath(file)).startsWith(`${root}${sep}`), 'Read escaped through a link'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    readPaths.push(file);
  }
  const catalogs = {};
  for (const catalog of ['.claude/skills', '.agents/skills', '.codex/skills']) {
    catalogs[catalog] = await readdir(join(seat.home, catalog));
    assert.equal(catalogs[catalog].length, 0, 'External skill catalog was populated');
  }
  const browserCode = calls.filter(call => /browser_run_code_unsafe$|browser_evaluate$/.test(call.name));
  assert(!browserCode.some(call => /SKILL\.md|\.claude[\\/]skills|\.agents[\\/]skills|\.codex[\\/]skills|auth\.json|credentials|homedir|process\.env|readFile|readdir/.test(JSON.stringify(call.input))), 'Browser code accessed ambient instructions or environment');
  return { status: 'passed', advertisedSkills: init.skills, skillToolAvailable: false, skillOrHelperInvocations: 0, externalCatalogs: catalogs, readPaths, browserCodeCalls: browserCode.length };
}

export async function revalidateGameReview({ planPath, seatId, outputDirectory, repoRootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..') }) {
  const pin = async file => { const bytes = await readFile(file); return { path: relative(repoRootDirectory, file), bytes: bytes.length, sha256: sha(bytes) }; };
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  assert.equal(plan.kind, 'vasir-game-judge-plan'); assert.equal(plan.executionEligible, true);
  const seat = plan.seats.find(seat => seat.id === seatId);
  assert.equal(seat?.judgeId, 'claude:claude-fable-5-1@max');
  const resultPath = join(seat.history, 'result.json'), stdoutPath = join(seat.history, 'stdout.jsonl'), auditPath = join(seat.history, 'browser-audit.jsonl'), requestsPath = join(seat.history, 'requests.json');
  const original = JSON.parse(await readFile(resultPath, 'utf8'));
  assert.equal(original.reviewRunId, plan.reviewRunId); assert.equal(original.judgeId, seat.judgeId);
  const stdout = await readFile(stdoutPath, 'utf8'), events = eventsFrom(stdout);
  const checks = await validateNativeSkillAdvertisement({ seat, events });
  const receipt = { kind: 'vasir-game-judge-amended-validation', schemaVersion: 1, rule: RULE, reviewRunId: plan.reviewRunId, judgeId: seat.judgeId, seatId, originalStatus: original.status, status: 'failed', reviewPlan: await pin(planPath), originalResult: await pin(resultPath), inputs: await Promise.all([stdoutPath, auditPath, requestsPath, fileURLToPath(import.meta.url)].map(pin)), checks, outputs: [], note: 'Validation distinguished advertised native skill metadata from skill use. Original reviewer output and validation outcome are retained.' };
  const output = resolve(outputDirectory); await mkdir(output, { recursive: true, mode: 0o700 });
  if (original.status === 'failed' && original.error === 'Game judge: Claude review loaded skills' && original.exitCode === 0 && !original.timedOut && !original.outputLimitExceeded && original.elapsedMs <= plan.timeoutMs) {
    const final = events.findLast(event => event.type === 'result');
    assert(final && !final.is_error, 'No successful native completion');
    assert(Object.keys(final.modelUsage ?? {}).every(model => ['claude-fable-5-1', 'claude-haiku-4-5'].includes(model)), 'Unexpected review model usage');
    const structured = final.structured_output ?? JSON.parse(final.result);
    const delivered = events.flatMap(event => (event.message?.content ?? []).filter(block => block.type === 'tool_use' && block.name === 'StructuredOutput')).at(-1);
    assert(delivered); assert.deepEqual(structured, delivered.input, 'Native structured outputs disagree');
    const audit = (await readFile(auditPath, 'utf8')).trim().split('\n').map(JSON.parse);
    receipt.inspection = await validateGameJudgeInspection({ seat, stdout, audit });
    const assessments = validateGameJudgeOutput(structured, { candidates: seat.candidates, rubric: plan.rubric });
    const requests = JSON.parse(await readFile(requestsPath, 'utf8'));
    for (const candidate of seat.candidates) {
      if (candidate.hasRuntime) assert(requests.some(request => request.path === `/${candidate.id}/index.html`), 'Runtime was not opened');
      if (candidate.media.length) assert(requests.some(request => candidate.media.some(media => request.path === `/${media.path}`)), 'Supplied media was not requested');
    }
    for (const file of seat.files) { const contents = await readFile(join(seat.serverRoot, file.path)); assert.equal(contents.length, file.bytes); assert.equal(sha(contents), file.sha256, 'Supplied bytes changed'); }
    const basis = JSON.parse(await readFile(join(seat.history, 'input-basis.json'), 'utf8'));
    receipt.inputs.push(await pin(join(seat.history, 'input-basis.json')));
    for (const assessment of assessments) {
      const mapping = seat.mappings.find(mapping => mapping.id === assessment.id);
      const wrapper = { kind: 'vasir-game-judgment', schemaVersion: 1, reviewRunId: plan.reviewRunId, judgeId: seat.judgeId, status: 'completed', artifactHash: mapping.artifactHash, inspection: { status: 'passed', method: 'fresh-browser-and-sampled-media-review', promptSha256: basis.promptSha256, rubricSha256: plan.rubricSha256 }, evaluation: assessment.evaluation };
      const file = join(output, `${mapping.rowId}.json`); await writeFile(file, encode(wrapper), { flag: 'wx', mode: 0o600 });
      receipt.outputs.push({ rowId: mapping.rowId, path: file, sha256: sha(encode(wrapper)), total: assessment.total });
    }
    receipt.status = 'completed'; receipt.usage = final.usage; receipt.costUsd = final.total_cost_usd ?? null;
  }
  const receiptPath = join(output, 'validation.json'); await writeFile(receiptPath, encode(receipt), { flag: 'wx', mode: 0o600 });
  return { receiptPath, status: receipt.status, originalStatus: original.status, outputs: receipt.outputs };
}
