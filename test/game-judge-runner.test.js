import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { executeGameJudgePair, gameJudgePrompt, prepareGameJudgePair, NATIVE_REVIEW_SKILL_ADVERTISEMENT, validateGameReviewSkillIsolation, startGameReviewServer, validateGameJudgeInspection, validateGameJudgeOutput } from '../benchmarks/2d-jumping-demo/judge-games.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rubric = JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmarks/2d-jumping-demo/rubric.json')));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const candidates = ['A', 'B'].map(id => ({ id, hasRuntime: true, liveId: `${id}-live`, media: [{ id: `${id}-m01`, type: 'image', atSeconds: 3.5, path: `${id}/media/01.png` }], observations: [] }));
const answer = () => ({ candidates: candidates.map(candidate => ({ id: candidate.id, evaluation: { gates: Object.fromEntries(['boot', 'mobilePlay', 'recovery'].map(id => [id, { status: 'pass', reason: 'Observed ordinary play.' }])), dimensions: rubric.dimensions.map(dimension => ({ id: dimension.id, rating: 3, reason: 'Specific observed behavior.', evidence: [{ mediaId: candidate.media[0].id, atSeconds: 3.5, note: 'Recorded contact.' }] })), summary: 'A bounded test assessment, never real benchmark evidence.', limitations: ['Synthetic test only.'] } })) });

test('Blinded game-review prompt contains anonymous evidence and excludes the named judge panel', () => {
  const prompt = gameJudgePrompt({ rubric, candidates, origin: 'http://127.0.0.1:4567' });
  assert.ok(prompt.includes(rubric.task));
  assert.ok(prompt.includes('http://127.0.0.1:4567/A/index.html'));
  assert.ok(prompt.includes('A-m01'));
  for (const judge of rubric.judges) assert.ok(!prompt.includes(judge));
  assert.match(prompt, /unverified\/null, not a product failure/);
});

test('Review schema binds ratings to the correct candidate and recorded timestamps', () => {
  const scored = validateGameJudgeOutput(answer(), { candidates, rubric });
  assert.deepEqual(scored.map(item => item.total), [75, 75]);
  const partial = answer(); partial.candidates[0].evaluation.dimensions[0].rating = null;
  assert.equal(validateGameJudgeOutput(partial, { candidates, rubric })[0].total, null);
  for (const mutation of [
    value => value.candidates.pop(),
    value => { value.candidates[1].id = 'A'; },
    value => { value.candidates[0].evaluation.dimensions[0].rating = 5; },
    value => { value.candidates[0].evaluation.dimensions[0].evidence[0].mediaId = 'B-m01'; },
    value => { value.candidates[0].evaluation.dimensions[0].evidence[0].atSeconds = 8; },
    value => { value.candidates[0].evaluation.dimensions[0].evidence = []; }
  ]) {
    const malformed = answer(); mutation(malformed);
    assert.throws(() => validateGameJudgeOutput(malformed, { candidates, rubric }));
  }
});

test('An absent submission stays unscored while the available candidate is assessed', () => {
  const pair = [candidates[0], { ...candidates[1], hasRuntime: false, media: [], observations: [{ text: 'No runnable submission produced.' }] }];
  const output = answer();
  const absent = output.candidates[1].evaluation;
  for (const gate of Object.values(absent.gates)) gate.status = 'unverified';
  for (const dimension of absent.dimensions) { dimension.rating = null; dimension.evidence = []; }
  assert.deepEqual(validateGameJudgeOutput(output, { candidates: pair, rubric }).map(item => item.total), [75, null]);
  absent.gates.boot.status = 'fail';
  assert.throws(() => validateGameJudgeOutput(output, { candidates: pair, rubric }), /absent submission gates/);
  absent.gates.boot.status = 'unverified'; absent.dimensions[0].rating = 0;
  assert.throws(() => validateGameJudgeOutput(output, { candidates: pair, rubric }));
});

test('Native Read must deliver actual file-bound image blocks; filenames or mismatched transforms do not qualify', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-image-inspection-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const file = path.join(root, 'observed.png'); fs.writeFileSync(file, source);
  const transformed = Buffer.concat([source, Buffer.from('transport-fixture')]).toString('base64');
  const seat = { root, workspace: root, configuration: { provider: 'claude' }, candidates };
  const events = [
    { message: { content: [{ type: 'tool_use', id: 'read-1', name: 'Read', input: { file_path: file } }] } },
    { message: { content: [{ type: 'tool_result', tool_use_id: 'read-1', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: source.toString('base64') } }] }] } },
    { message: { content: [{ type: 'tool_use', id: 'read-2', name: 'Read', input: { file_path: file } }] } },
    { message: { content: [{ type: 'tool_result', tool_use_id: 'read-2', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: transformed } }] }] }, tool_use_result: { type: 'image', file: { base64: transformed, type: 'image/png', originalSize: source.length, dimensions: { originalWidth: 1, originalHeight: 1 } } } }
  ];
  const inspect = () => validateGameJudgeInspection({ seat, stdout: events.map(event => JSON.stringify(event)).join('\n'), audit: [] });
  const result = await inspect();
  assert.equal(result.nativeReadImageResults, 2);
  assert.deepEqual(result.nativeReadImages.map(image => image.delivery), ['exact-file-image', 'native-read-image-transform']);
  events[3].tool_use_result.file.originalSize++;
  await assert.rejects(inspect, /lacks actual browser or source-bound native Read/);
  await assert.rejects(() => validateGameJudgeInspection({ seat, stdout: '', audit: [{ type: 'result', name: 'browser_take_screenshot', isError: false, content: [{ type: 'text', text: 'observed.png' }] }] }), /lacks actual/);
});

test('Anonymous review server exposes only frozen runtime/media paths and supports video ranges', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-judge-server-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'A'), { recursive: true });
  fs.writeFileSync(path.join(root, 'A/index.html'), 'game fixture');
  fs.writeFileSync(path.join(root, 'A/video.mp4'), '0123456789');
  fs.writeFileSync(path.join(root, 'private.json'), 'private mapping');
  const files = ['A/index.html', 'A/video.mp4'].map(relative => { const bytes = fs.readFileSync(path.join(root, relative)); return { path: relative, bytes: bytes.length, sha256: hash(bytes) }; });
  const server = await startGameReviewServer({ serverRoot: root, files });
  t.after(server.close);
  assert.equal(await (await fetch(`${server.origin}/A/index.html`)).text(), 'game fixture');
  const range = await fetch(`${server.origin}/A/video.mp4`, { headers: { range: 'bytes=2-5' } });
  assert.equal(range.status, 206); assert.equal(await range.text(), '2345');
  for (const suffix of ['/private.json', '/A/../private.json', '/%70rivate.json', '/']) assert.equal((await fetch(`${server.origin}${suffix}`)).status, 404);
  assert.equal((await fetch(`${server.origin}/A/index.html`, { method: 'POST' })).status, 404);
});

test('Synthetic pair preparation calls no model, hides private mappings, and cannot launch', { skip: process.platform !== 'darwin' }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-judge-prepare-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  const game = '<!doctype html><title>Explicit synthetic test</title><canvas></canvas>';
  const pair = { kind: 'vasir-game-judge-synthetic', schemaVersion: 1, pairId: 'fixture-only', candidates: [0, 1].map(index => {
    const directory = `source-${index}`; fs.mkdirSync(path.join(root, directory)); fs.writeFileSync(path.join(root, directory, 'index.html'), game);
    return { rowId: `private-fixture-row-${index}`, artifactHash: hash(`artifact-${index}`), package: { root: directory, entrypoint: 'index.html', files: [{ path: 'index.html', bytes: Buffer.byteLength(game), sha256: hash(game) }] }, media: [], observations: [] };
  }) };
  const manifestPath = path.join(root, 'pair.json'); fs.writeFileSync(manifestPath, JSON.stringify(pair));
  const result = await prepareGameJudgePair({ manifestPath, outputDirectory: path.join(root, 'prepared'), repoRootDirectory: root, synthetic: true });
  const plan = JSON.parse(fs.readFileSync(result.planPath));
  t.after(() => fs.rmSync(plan.temporaryRoot, { recursive: true, force: true }));
  assert.equal(result.preflight.inferenceCalls, 0);
  assert.equal(result.executionEligible, false);
  for (const seat of plan.seats) {
    assert.equal(seat.environmentKeys.includes('CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK'), seat.configuration.provider === 'claude');
    for (const candidate of pair.candidates) {
      assert.ok(!seat.promptTemplate.includes(candidate.rowId));
      assert.ok(!seat.promptTemplate.includes(candidate.artifactHash));
    }
    assert.ok(!fs.existsSync(path.join(seat.home, '.codex/auth.json')));
    assert.ok(!fs.existsSync(path.join(seat.home, '.claude/.credentials.json')));
  }
  await assert.rejects(() => executeGameJudgePair({ planPath: result.planPath }), /synthetic/);
});

test('A standalone historical artifact uses one anonymous assessment without weakening paired review cardinality', () => {
  const standalone = [candidates[0]], output = answer(); output.candidates.pop();
  const prompt = gameJudgePrompt({ rubric, candidates: standalone, origin: 'http://127.0.0.1:4567' });
  assert.match(prompt, /one anonymous browser game/);
  assert.match(prompt, /exactly A, all three gates/);
  assert.doesNotMatch(prompt, /inspect BOTH|exactly A and B/);
  const schema = JSON.parse(prompt.split('OUTPUT JSON SCHEMA\n')[1]);
  assert.equal(schema.properties.candidates.minItems, 1); assert.equal(schema.properties.candidates.maxItems, 1);
  assert.deepEqual(schema.properties.candidates.items.properties.id.enum, ['A']);
  assert.deepEqual(validateGameJudgeOutput(output, { candidates: standalone, rubric }).map(value => value.total), [75]);
  assert.throws(() => validateGameJudgeOutput(answer(), { candidates: standalone, rubric }), /exactly/);
  assert.throws(() => validateGameJudgeOutput(output, { candidates, rubric }), /exactly/);
  output.candidates[0].id = 'B';
  assert.throws(() => validateGameJudgeOutput(output, { candidates: standalone, rubric }), /unknown/);
  const pairedSchema = JSON.parse(gameJudgePrompt({ rubric, candidates, origin: 'http://127.0.0.1:4567' }).split('OUTPUT JSON SCHEMA\n')[1]);
  assert.equal(pairedSchema.properties.candidates.minItems, 2); assert.equal(pairedSchema.properties.candidates.maxItems, 2);
});


test('Future reviews distinguish native skill advertisements from use and restrict reads to isolated evidence', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-skill-isolation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const seat = { root, workspace: path.join(root, 'workspace'), home: path.join(root, 'home') };
  for (const directory of [seat.workspace, path.join(root, 'browser-output'), ...['.claude/skills', '.agents/skills', '.codex/skills'].map(name => path.join(seat.home, name))]) fs.mkdirSync(directory, { recursive: true });
  const file = path.join(root, 'browser-output', 'snapshot.yaml'); fs.writeFileSync(file, 'Observed browser accessibility evidence.');
  const events = [{ type: 'system', subtype: 'init', model: 'claude-fable-5-1', skills: [...NATIVE_REVIEW_SKILL_ADVERTISEMENT], plugins: [], tools: ['Read', 'mcp__browser__browser_take_screenshot'] }, { message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: file } }] } }];
  assert.equal((await validateGameReviewSkillIsolation({ seat, events })).evidenceReadCount, 1);
  const mutate = async fn => { const altered = structuredClone(events); fn(altered); await assert.rejects(() => validateGameReviewSkillIsolation({ seat, events: altered })); };
  await mutate(value => value[0].skills.push('external-skill'));
  await mutate(value => value[0].tools.push('Skill'));
  await mutate(value => { value[1].message.content[0].name = 'Skill'; });
  await mutate(value => { value[1].message.content[0].input.file_path = path.join(seat.home, '.claude/.credentials.json'); });
  fs.writeFileSync(path.join(seat.home, '.agents/skills/injected.md'), 'Unexpected instructions');
  await assert.rejects(() => validateGameReviewSkillIsolation({ seat, events }), /catalog populated/);
});
