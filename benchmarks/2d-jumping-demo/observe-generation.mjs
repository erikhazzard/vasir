#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const planPath = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node observe-generation.mjs <completed-plan.json>');
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = async (path) => { try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const results = await Promise.all(plan.rows.map(async (row) => JSON.parse(await readFile(join(row.history, 'result.json'), 'utf8'))));
if (results.length !== plan.policy.configurations.length * plan.policy.conditions.length) throw new Error('Observations require every row in the prepared generation scope to be finalized.');

async function tree(root, current = root) {
  const entries = [];
  for (const name of (await readdir(current)).sort()) {
    const path = join(current, name), stat = await lstat(path);
    const local = relative(root, path).split(sep).join('/');
    if (stat.isDirectory()) entries.push(...await tree(root, path));
    else if (stat.isFile()) entries.push({ path: local, type: 'file', bytes: stat.size, sha256: hash(await readFile(path)) });
    else if (stat.isSymbolicLink()) entries.push({ path: local, type: 'symlink', target: await readlink(path) });
    else throw new Error(`Unsupported preserved source entry: ${path}`);
  }
  return entries;
}

const skills = await Promise.all(plan.catalog.entries.filter((entry) => entry.type === 'file' && entry.path.endsWith('/SKILL.md')).map(async (entry) => ({
  path: entry.path, sha256: entry.sha256, text: await readFile(join(plan.catalog.directory, entry.path), 'utf8')
})));
function contentMatch(text, skill) {
  // The explicit read target plus returned frozen content excludes listings, wc,
  // unsuccessful reads, catalog discovery, and assistant claims about using a skill.
  const lines = skill.text.split('\n').filter((line) => line.length >= 80);
  return lines.some((line) => text.includes(line));
}
function contentText(content) {
  return typeof content === 'string' ? content : Array.isArray(content) ? content.filter((part) => part.type === 'text').map((part) => part.text).join('\n') : '';
}

const observations = [];
const integrityRows = [];
for (let index = 0; index < plan.rows.length; index++) {
  const row = plan.rows[index], result = results[index];
  const stdoutPath = join(row.history, 'stdout.jsonl');
  const stdout = await readFile(stdoutPath, 'utf8');
  const records = stdout.split('\n').flatMap((line, offset) => { if (!line.trim()) return []; try { return [{ line: offset + 1, event: JSON.parse(line) }]; } catch { return []; } });
  const observed = new Map(), unresolved = [], failed = [];
  const remember = (skill, proof) => {
    const entry = observed.get(skill.path) ?? { path: skill.path, frozenSha256: skill.sha256, receipts: [] };
    entry.receipts.push(proof); observed.set(skill.path, entry);
  };
  const installedRoot = row.catalog?.installedPath;
  function observeRead(command, output, success, proof) {
    if (!installedRoot) return;
    for (const skill of skills) {
      if (!command.includes(`${installedRoot}/${skill.path}`)) continue;
      if (!success) { failed.push({ path: skill.path, ...proof }); continue; }
      if (contentMatch(output, skill)) remember(skill, { ...proof, proof: 'successful explicit file target and returned frozen content', fullFrozenTextInReceipt: output.includes(skill.text.trim()), outputSha256: hash(output) });
      else unresolved.push({ path: skill.path, ...proof, reason: 'No frozen content match; metadata/listing or unsupported read receipt.' });
    }
  }
  if (row.configuration.provider === 'codex') {
    for (const { line, event } of records) {
      if (event.type !== 'item.completed' || event.item?.type !== 'command_execution') continue;
      const item = event.item;
      observeRead(item.command, item.aggregated_output ?? '', item.status === 'completed' && item.exit_code === 0, { line, nativeId: item.id, tool: 'command_execution', exitCode: item.exit_code });
    }
  } else {
    const calls = new Map();
    for (const { line, event } of records) {
      if (!Array.isArray(event.message?.content)) continue;
      for (const part of event.message.content) {
        if (part.type === 'tool_use') calls.set(part.id, { ...part, line });
        if (part.type !== 'tool_result') continue;
        const call = calls.get(part.tool_use_id);
        if (!call) continue;
        const proof = { line, invocationLine: call.line, nativeId: call.id, tool: call.name, modelFacingOutputTruncated: contentText(part.content).includes('<persisted-output>') };
        const success = part.is_error !== true && event.tool_use_result?.interrupted !== true;
        const output = event.tool_use_result?.stdout ?? contentText(part.content);
        if (call.name === 'Bash') observeRead(call.input.command, output, success, proof);
        if (call.name === 'Read') observeRead(call.input.file_path, output, success, proof);
        if (call.name === 'Skill' && installedRoot) {
          const skill = skills.find((candidate) => candidate.path === `${call.input.skill}/SKILL.md`);
          if (!skill) continue;
          const injection = records.find((candidate) => candidate.line > line && candidate.line <= line + 3 && candidate.event.type === 'user' && candidate.event.isSynthetic && contentText(candidate.event.message?.content).includes(`Base directory for this skill: ${installedRoot}/${call.input.skill}`));
          const injectedText = contentText(injection?.event.message?.content);
          if (success && event.tool_use_result?.success === true && contentMatch(injectedText, skill)) remember(skill, { ...proof, injectionLine: injection.line, proof: 'successful native Skill invocation and synthetic frozen-content injection', outputSha256: hash(injectedText) });
          else unresolved.push({ path: skill.path, ...proof, reason: 'Native skill content injection was not proven.' });
        }
      }
    }
  }
  const bareSkillMentions = row.condition === 'bare' ? records.filter(({ event }) => event.type === 'item.completed' && event.item?.type === 'command_execution' && /\/skills\/.*SKILL\.md/.test(event.item.command)).map(({ line, event }) => ({ line, nativeId: event.item.id })) : [];
  observations.push({ rowId: row.rowId, configuration: row.configuration.id, condition: row.condition, generationStatus: result.status, stdoutPath, stdoutSha256: hash(stdout), observedSkillCount: observed.size, skills: [...observed.values()].sort((a, b) => a.path.localeCompare(b.path)), unresolvedReceipts: unresolved, failedReceipts: failed, bareUnclassifiedSkillMentions: bareSkillMentions });
  const entries = await tree(result.source.directory);
  const actualSourceSha256 = hash(JSON.stringify(entries));
  const promptSha256 = hash(await readFile(join(row.history, 'prompt.txt')));
  const credentialFilesPresent = await Promise.all(['.codex/auth.json', '.claude/.credentials.json'].map((path) => exists(join(row.home, path))));
  integrityRows.push({ rowId: row.rowId, status: result.status, sourceSha256: result.source.sha256, actualSourceSha256, sourceMatches: actualSourceSha256 === result.source.sha256, promptSha256, exactPromptMatches: promptSha256 === plan.promptSha256, credentialFilesPresent: credentialFilesPresent.some(Boolean), elapsedMs: result.elapsedMs, finalProviderUsageAvailable: result.usage !== null });
}
const sweep = results.flatMap((row) => [{ at: Date.parse(row.startedAt), delta: 1 }, { at: Date.parse(row.endedAt), delta: -1 }]).sort((a, b) => a.at - b.at || a.delta - b.delta);
let active = 0, maxActive = 0;
for (const point of sweep) { active += point.delta; maxActive = Math.max(active, maxActive); }
const run = await readFile(join(plan.history, 'run.json'));
const aggregate = JSON.parse(run);
const actualCatalogSha256 = hash(JSON.stringify(await tree(plan.catalog.directory)));
const actualRunnerSha256 = hash(await readFile(new URL('./run-agents.mjs', import.meta.url)));
const integrity = { schemaVersion: 1, observedAt: new Date().toISOString(), planPath, runSha256: hash(run), finalizedRows: results.length, aggregateMatchesRowResults: JSON.stringify(aggregate.rows) === JSON.stringify(results), actualCatalogSha256, frozenCatalogMatches: actualCatalogSha256 === plan.catalog.sha256, actualRunnerSha256, finalRunnerMatchesPlan: actualRunnerSha256 === plan.runnerSha256, maxConcurrentNativeSessions: maxActive, rows: integrityRows };
const reads = { schemaVersion: 1, observedAt: integrity.observedAt, planPath, catalogSha256: plan.catalog.sha256, scope: 'Private post-run observation; successful file reads/native Skill loads only. This does not prove comprehension, complete model visibility, application, or causal effect. Returned content may be truncated by native model-facing output limits. Metadata/listing commands and prose are excluded. Unrecognized read mechanisms remain unknown.', rows: observations };
await writeFile(join(plan.history, 'generation-integrity.json'), json(integrity));
await writeFile(join(plan.history, 'skill-read-observations.json'), json(reads));
if (maxActive > 2 || !integrity.aggregateMatchesRowResults || !integrity.frozenCatalogMatches || !integrity.finalRunnerMatchesPlan || integrityRows.some((row) => !row.sourceMatches || !row.exactPromptMatches || row.credentialFilesPresent)) throw new Error('Generation integrity check failed; see private receipt.');
process.stdout.write(json({ integrityPath: join(plan.history, 'generation-integrity.json'), skillReadsPath: join(plan.history, 'skill-read-observations.json'), maxConcurrentNativeSessions: maxActive, rows: observations.map((row) => ({ rowId: row.rowId, condition: row.condition, observedSkills: row.observedSkillCount, paths: row.skills.map((skill) => skill.path), unresolvedCount: row.unresolvedReceipts.length })) }));
