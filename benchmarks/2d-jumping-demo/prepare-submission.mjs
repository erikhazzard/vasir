#!/usr/bin/env node
// Build/deployment preparation only. The frozen submission is never edited.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, lstat, cp, mkdtemp, realpath } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [resultArgument, settingsArgument] = process.argv.slice(2);
if (!resultArgument || !settingsArgument) throw new Error('Usage: prepare-submission.mjs <result.json> <packaging-settings.json>');
const resultPath = resolve(resultArgument);
const result = JSON.parse(await readFile(resultPath));
const settings = JSON.parse(await readFile(resolve(settingsArgument)));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const allowed = new Set(['.html', '.js', '.mjs', '.css', '.json', '.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.ogg', '.mp3', '.wav', '.mp4', '.webm', '.wasm', '.glb', '.gltf']);
const check = (condition, text) => { if (!condition) throw new Error(text); };
const inside = (root, path) => { const name = relative(root, path); check(name !== '..' && !name.startsWith(`..${sep}`), 'Packaging path escapes its root'); return path; };
async function entries(root, current = root) {
  const files = [];
  for (const name of (await readdir(current)).sort()) {
    const path = join(current, name); const stat = await lstat(path);
    if (stat.isDirectory()) files.push(...await entries(root, path));
    else if (stat.isFile()) { const bytes = await readFile(path); files.push({ path: relative(root, path).split(sep).join('/'), type: 'file', bytes: bytes.length, sha256: sha256(bytes) }); }
    else throw new Error(`Unsupported symbolic link or special file in public package: ${path}`);
  }
  return files;
}
// Verify against the executor's retained tree without hashing unrelated paths.
async function assertSource() {
  for (const file of result.source.entries) {
    if (file.type !== 'file') continue;
    const bytes = await readFile(join(result.source.directory, file.path));
    check(bytes.length === file.bytes && sha256(bytes) === file.sha256, `Frozen source changed: ${file.path}`);
  }
}
await assertSource();
const staging = await realpath(await mkdtemp('/private/tmp/jump-package-'));
const work = join(staging, 'workspace');
const home = join(staging, 'home');
await mkdir(home); await mkdir(join(staging, 'tmp'));
await cp(result.source.directory, work, { recursive: true, verbatimSymlinks: true });
const sandbox = join(staging, 'build.sb');
const runtimeRoot = resolve(dirname(process.execPath), '..');
const runtimeParents = ['/private/tmp'];
for (let parent = dirname(runtimeRoot); parent !== dirname(parent); parent = dirname(parent)) runtimeParents.push(parent);
await writeFile(sandbox, `(version 1)\n(allow default)\n(deny file-read* file-write* (subpath ${JSON.stringify(homedir())}) (subpath "/private/tmp") (subpath "/private/var/folders"))\n(allow file-read* file-write* (subpath ${JSON.stringify(staging)}))\n(allow file-read* (subpath ${JSON.stringify(runtimeRoot)}))\n(allow file-read-metadata ${runtimeParents.map(parent => `(literal ${JSON.stringify(parent)})`).join(' ')})\n`);
const environment = { PATH: `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: home, TMPDIR: `${join(staging, 'tmp')}/`, TMPPREFIX: join(staging, 'tmp/zsh'), npm_config_cache: join(home, '.npm'), CI: '1', NO_COLOR: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const commands = [];
for (const argv of settings.commands ?? []) {
  check(Array.isArray(argv) && argv.length > 0 && argv.every(x => typeof x === 'string'), 'Build command must be literal argv');
  const startedAt = new Date().toISOString();
  const execution = await new Promise((done, reject) => {
    const child = spawn('/usr/bin/sandbox-exec', ['-f', sandbox, ...argv], { cwd: work, env: environment, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 10 * 60 * 1000);
    child.stdout.on('data', data => { stdout = (stdout + data).slice(-100000); });
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-100000); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', exitCode => { clearTimeout(timer); done({ argv, startedAt, endedAt: new Date().toISOString(), exitCode, timedOut, stdout, stderr }); });
  });
  commands.push(execution);
  if (execution.exitCode !== 0) {
    await writeFile(join(dirname(resultPath), 'packaging-failure.json'), `${JSON.stringify({ inputArtifactHash: result.source.sha256, commands, sourceEdited: false }, null, 2)}\n`);
    throw new Error(`Authored build failed; source left intact. See ${join(dirname(resultPath), 'packaging-failure.json')}`);
  }
}
const buildRoot = inside(work, resolve(work, settings.outputDirectory ?? '.'));
const publicRoot = join(dirname(resultPath), 'public-runtime');
await mkdir(publicRoot, { recursive: true });
check((await readdir(publicRoot)).length === 0, 'Public runtime already exists; retain the previous package instead of overwriting it.');
const selected = settings.files ?? (await entries(buildRoot)).map(file => file.path);
let publicEntries = [];
for (const name of selected) {
  check(typeof name === 'string' && !name.startsWith('/') && !name.split('/').some(part => part === '..' || part.startsWith('.')), 'Hidden or escaping public path');
  check(!/(^|\/)(node_modules|evidence|test|tests|coverage|package-lock\.json|package\.json|auth\.json|credentials\.json)(\/|$)/i.test(name), `Private/development file must not be published: ${name}`);
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
  check(allowed.has(extension), `Unsupported runtime extension: ${name}`);
  const source = inside(buildRoot, resolve(buildRoot, name));
  inside(await realpath(buildRoot), await realpath(source));
  check((await lstat(source)).isFile(), `Runtime file is not regular: ${name}`);
  const bytes = await readFile(source);
  const target = join(publicRoot, name); await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes);
  publicEntries.push({ path: name, type: 'file', bytes: bytes.length, sha256: sha256(bytes) });
}
check(publicEntries.some(file => file.path === settings.entrypoint), 'Authored HTML entrypoint is not in the selected output');
const derivations = [];
if (settings.googleFontsManifest) {
  const { vendorGoogleFonts } = await import('./vendor-google-fonts.mjs');
  derivations.push(await vendorGoogleFonts({ packageRoot: publicRoot, frozenSourceRoot: result.source.directory, entrypoint: settings.entrypoint, inputArtifactHash: result.source.sha256, dependencyManifestPath: resolve(settings.googleFontsManifest) }));
  publicEntries = await entries(publicRoot);
  for (const file of publicEntries) check(allowed.has(file.path.slice(file.path.lastIndexOf('.')).toLowerCase()) && !file.path.split('/').some(part => part.startsWith('.')), `Unexpected relocated dependency path: ${file.path}`);
}
await assertSource();
const receipt = { kind: 'vasir-game-build-receipt', schemaVersion: 1, inputArtifactHash: result.source.sha256, exitCode: 0, sourceEdited: false, ...(result.synthetic ? { synthetic: true } : {}), settings, commands, derivations, output: { directory: publicRoot, entries: publicEntries } };
await writeFile(join(dirname(resultPath), 'build-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ rowId: result.rowId, publicRoot, files: publicEntries.length, bytes: publicEntries.reduce((sum, file) => sum + file.bytes, 0), receipt: relative(repo, join(dirname(resultPath), 'build-receipt.json')) }));
