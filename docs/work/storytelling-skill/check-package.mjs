import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Packaging only: no generation, literary scoring, or behavioral evaluation.
const workRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(workRoot, '../../..');
const skillRoot = path.join(repoRoot, '.agents/skills/writing-storytelling');
const { readSkillMetadata } = await import(path.join(repoRoot, 'cli/skill-metadata.js'));
const metadata = readSkillMetadata(skillRoot);
assert.equal(metadata.name, 'writing-storytelling');
assert.ok(metadata.description.length > 0 && metadata.description.length <= 1024);
assert.ok(!/[<>]/.test(metadata.description));
assert.ok(!fs.existsSync(path.join(skillRoot, 'evals')), 'User requested no eval package');
assert.ok(!fs.existsSync(path.join(workRoot, 'eval-results')), 'User requested no generated eval artifacts');
assert.ok(!fs.existsSync(path.join(repoRoot, '.agents/skills/writing__story-controlling-idea')));

const files = [path.join(skillRoot, 'SKILL.md'), ...fs.readdirSync(path.join(skillRoot, 'references'))
  .filter(name => name.endsWith('.md')).sort().map(name => path.join(skillRoot, 'references', name))];
const contents = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const headings = new Map();
const graph = new Map();
let linkCount = 0;
for (const [file, text] of contents) {
  assert.ok(!text.includes('/Users/') && !text.includes('/home/'), `${file}: machine-specific runtime path`);
  assert.ok(!/^\s*(?:TODO|TBD|FIXME)\b/m.test(text), `${file}: unfinished scaffold`);
  if (text.split('\n').length > 100) {
    assert.ok(/^(?:## Contents|Contents:)/m.test(text), `${file}: missing contents navigation`);
  }
  const seen = new Map();
  const anchors = new Set();
  for (const match of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = match[1].trim().toLowerCase().replace(/<[^>]*>/g, '')
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').replace(/\s/g, '-');
    const count = seen.get(base) ?? 0;
    anchors.add(count ? `${base}-${count}` : base);
    seen.set(base, count + 1);
  }
  for (const match of text.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anchors.add(match[1]);
  headings.set(file, anchors);
}
for (const [file, text] of contents) {
  const edges = [];
  for (const match of text.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    assert.ok(!path.isAbsolute(target), `${file}: absolute link ${target}`);
    const split = target.indexOf('#');
    const relative = decodeURIComponent(split < 0 ? target : target.slice(0, split));
    const anchor = split < 0 ? null : decodeURIComponent(target.slice(split + 1));
    const resolved = relative ? path.resolve(path.dirname(file), relative) : file;
    assert.ok(resolved.startsWith(`${skillRoot}${path.sep}`), `${file}: link leaves package ${target}`);
    assert.ok(fs.existsSync(resolved), `${file}: missing link ${target}`);
    if (anchor) assert.ok(headings.get(resolved)?.has(anchor), `${file}: missing anchor ${target}`);
    if (contents.has(resolved)) edges.push(resolved);
    linkCount++;
  }
  graph.set(file, edges);
}
const reachable = new Set();
function visit(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const next of graph.get(file) ?? []) visit(next);
}
visit(path.join(skillRoot, 'SKILL.md'));
assert.equal(reachable.size, files.length, 'Reference not reachable from master');
const rootText = contents.get(path.join(skillRoot, 'SKILL.md'));
assert.ok(rootText.split('\n').length < 500, 'Master entrypoint exceeds skill-authoring guidance');
assert.ok(!rootText.includes('$writing__story-controlling-idea'), 'Legacy authority remains');
const expectedIdea = 'Freedom is preserved because it is given to those who give themselves; the pursuit of domination destroys the freedom it promises.';
for (const name of ['story-overview.md', 'lotr-case-study.md']) {
  assert.ok(contents.get(path.join(skillRoot, 'references', name)).includes(expectedIdea), `${name}: controlling idea changed`);
}
const inventory = files.map(file => ({
  file: path.relative(skillRoot, file),
  words: contents.get(file).trim().split(/\s+/u).length,
  lines: contents.get(file).split('\n').length
}));
process.stdout.write(`${JSON.stringify({
  status: 'pass', name: metadata.name, category: metadata.category,
  references: files.length - 1, localLinksChecked: linkCount,
  reachablePromptFiles: reachable.size,
  totalWords: inventory.reduce((sum, item) => sum + item.words, 0),
  inventory
}, null, 2)}\n`);
