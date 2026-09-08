import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { NATIVE_ADVERTISED_SKILLS, validateNativeSkillAdvertisement, revalidateGameReview } from '../benchmarks/2d-jumping-demo/revalidate-game-reviews.mjs';

async function fixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'synthetic-native-skill-metadata-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const seat = { id: 'synthetic-seat', root, workspace: join(root, 'workspace'), home: join(root, 'home'), history: join(root, 'history'), judgeId: 'claude:claude-fable-5-1@max', configuration: { provider: 'claude' } };
  for (const folder of [seat.workspace, seat.history, ...['.claude/skills', '.agents/skills', '.codex/skills'].map(folder => join(seat.home, folder))]) await mkdir(folder, { recursive: true });
  const init = { type: 'system', subtype: 'init', model: 'claude-fable-5-1', skills: [...NATIVE_ADVERTISED_SKILLS], tools: ['Read', 'StructuredOutput', 'mcp__browser__browser_take_screenshot'], plugins: [] };
  const events = [init, { message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: join(seat.workspace, 'synthetic-image.png') } }] } }];
  return { seat, events, init };
}

test('Synthetic metadata fixture distinguishes advertisements from skill availability or use', async t => {
  const { seat, events, init } = await fixture(t);
  assert.equal((await validateNativeSkillAdvertisement({ seat, events })).status, 'passed');
  init.tools.push('Skill');
  await assert.rejects(validateNativeSkillAdvertisement({ seat, events }), /Forbidden native review tool/);
  init.tools.pop();
  events.push({ message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'verify' } }] } });
  await assert.rejects(validateNativeSkillAdvertisement({ seat, events }), /invoked a skill/);
  events.pop(); init.skills.push('external-catalog-skill');
  await assert.rejects(validateNativeSkillAdvertisement({ seat, events }), /Unexpected advertised/);
});

test('Synthetic metadata fixture rejects ambient instruction reads and populated catalogs', async t => {
  const { seat, events } = await fixture(t);
  events[1].message.content[0].input.file_path = join(seat.workspace, 'SKILL.md');
  await assert.rejects(validateNativeSkillAdvertisement({ seat, events }), /isolated screenshot/);
  events[1].message.content[0].input.file_path = join(seat.workspace, 'synthetic-image.png');
  await writeFile(join(seat.home, '.claude/skills/external.md'), 'Synthetic external instructions.');
  await assert.rejects(validateNativeSkillAdvertisement({ seat, events }), /External skill catalog/);
});

test('Offline advertisement correction cannot turn a timeout into an assessment', async t => {
  const { seat, events } = await fixture(t);
  const planPath = join(seat.root, 'plan.json');
  await writeFile(planPath, JSON.stringify({ kind: 'vasir-game-judge-plan', executionEligible: true, reviewRunId: 'synthetic-control-only', seats: [seat], timeoutMs: 1200000 }));
  const original = { kind: 'vasir-game-judge-result', status: 'failed', reviewRunId: 'synthetic-control-only', judgeId: seat.judgeId, error: 'Game judge: review process failed, timed out, or exceeded output bounds', elapsedMs: 1200090, exitCode: 143, timedOut: true };
  const originalText = JSON.stringify(original);
  await writeFile(join(seat.history, 'result.json'), originalText);
  await writeFile(join(seat.history, 'stdout.jsonl'), events.map(event => JSON.stringify(event)).join('\n'));
  await writeFile(join(seat.history, 'browser-audit.jsonl'), '');
  await writeFile(join(seat.history, 'requests.json'), '[]');
  const result = await revalidateGameReview({ planPath, seatId: seat.id, outputDirectory: join(seat.root, 'amendment') });
  assert.equal(result.status, 'failed'); assert.deepEqual(result.outputs, []);
  assert.equal(await readFile(join(seat.history, 'result.json'), 'utf8'), originalText);
});
