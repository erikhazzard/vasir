import fs from 'node:fs/promises';
import { constants, createWriteStream } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
export function within(root, relative) {
  const result = path.resolve(root, relative);
  if (!relative || path.isAbsolute(relative) || !result.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error(`Unsafe relative path: ${relative}`);
  }
  return result;
}
export async function filesIn(root, relative = '') {
  const result = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(root, file));
    else if (entry.isFile()) result.push(file);
    else throw new Error(`Unexpected non-regular fixture entry: ${file}`);
  }
  return result.sort();
}
async function copyFile(from, to) {
  if (!(await fs.lstat(from)).isFile()) throw new Error(`Only regular source files allowed: ${from}`);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to, constants.COPYFILE_FICLONE);
}

// Repository-specific source, held-out tests and faults are private inputs, never bundled here.
export async function prepareFixture({ backendRoot, fixtureDir, configPath }) {
  const config = await readJson(configPath);
  const sourceDir = path.join(fixtureDir, 'source');
  await fs.mkdir(sourceDir, { recursive: true });
  if ((await fs.readdir(sourceDir)).length) throw new Error('Fixture source must start empty');
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: backendRoot, encoding: 'utf8' }).split('\0').filter(Boolean);
  const selected = tracked.filter(file => config.allowlist.some(prefix => file === prefix || file.startsWith(`${prefix}/`))
    && !config.exclude.some(prefix => file === prefix || file.startsWith(`${prefix}/`)));
  const hashes = {};
  for (const file of selected.sort()) {
    const source = within(backendRoot, file);
    await copyFile(source, within(sourceDir, file));
    hashes[file] = sha256(await fs.readFile(within(sourceDir, file)));
  }
  for (const file of config.supportFiles || []) {
    const destination = within(sourceDir, file.destination);
    await copyFile(file.source, destination);
    hashes[file.destination] = sha256(await fs.readFile(destination));
  }
  if (!selected.length) throw new Error('Empty fixture allowlist');
  const sortedHashes = Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)));
  const dependencyDir = path.join(fixtureDir, 'dependencies', 'node_modules');
  await fs.mkdir(path.dirname(dependencyDir), { recursive: true });
  await fs.cp(path.join(backendRoot, 'node_modules'), dependencyDir, { recursive: true, dereference: true, mode: constants.COPYFILE_FICLONE });
  const manifest = {
    schemaVersion: 1,
    sourceDir, dependencyDir,
    backendRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: backendRoot, encoding: 'utf8' }).trim(),
    sourceHash: sha256(JSON.stringify(sortedHashes)), fileHashes: sortedHashes,
    dependencyLockHash: hashes['package-lock.json'],
    submissionPrefix: config.submissionPrefix,
    taskPath: config.taskPath,
    privateConfigPath: path.resolve(configPath),
    createdAt: new Date().toISOString(),
  };
  await writeJson(path.join(fixtureDir, 'manifest.json'), manifest);
  return manifest;
}

export async function copyFixture({ fixture, destination }) {
  await fs.mkdir(destination, { recursive: true });
  if ((await fs.readdir(destination)).length) throw new Error(`Destination must be empty: ${destination}`);
  await fs.cp(fixture.sourceDir, destination, { recursive: true, mode: constants.COPYFILE_FICLONE });
  await fs.symlink(fixture.dependencyDir, path.join(destination, 'node_modules'), 'dir');
}

export function cleanTestEnv(extra = {}) {
  return {
    PATH: process.env.PATH || '/usr/bin:/bin',
    TMPDIR: process.env.TMPDIR || '/tmp',
    LANG: 'en_US.UTF-8', NODE_ENV: 'test', ENV: 'test',
    AWS_ACCESS_KEY_ID: 'local', AWS_SECRET_ACCESS_KEY: 'local', AWS_REGION: 'us-east-1',
    AWS_EC2_METADATA_DISABLED: 'true', OPENAI_API_KEY: '', GEMINI_API_KEY: '',
    ELEVENLABS_API_KEY: '', TRIPO3D_API_KEY: '', EMF_ENABLED: 'false',
    ...extra,
  };
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function waitForPort(port, child, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.launchError) throw child.launchError;
    if (child.exitCode !== null) throw new Error(`Service exited ${child.exitCode}`);
    const connected = await new Promise(resolve => {
      const socket = net.connect({ host: '127.0.0.1', port });
      const finish = value => { socket.destroy(); resolve(value); };
      socket.once('connect', () => finish(true)); socket.once('error', () => finish(false));
      socket.setTimeout(250, () => finish(false));
    });
    if (connected) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Local service startup deadline exceeded on ${port}`);
}
async function stop(child) {
  if (!child.pid) return;
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise(resolve => child.once('close', resolve));
  child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
  await closed;
  clearTimeout(timer);
}

export async function startServices({ fixture, outputDir }) {
  const config = await readJson(fixture.privateConfigPath);
  await fs.mkdir(outputDir, { recursive: true });
  const redisPort = await freePort();
  const ddbPort = await freePort();
  const children = [];
  const streams = [];
  function launch(binary, args, label) {
    const stream = createWriteStream(path.join(outputDir, `${label}.log`)); streams.push(stream);
    const child = spawn(binary, args, { cwd: outputDir, env: cleanTestEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
    child.once('error', error => { child.launchError = error; });
    child.stdout.pipe(stream, { end: false }); child.stderr.pipe(stream, { end: false });
    children.push(child);
    return child;
  }
  const close = async () => { await Promise.all(children.map(stop)); await Promise.all(streams.map(stream => new Promise(resolve => stream.end(resolve)))); };
  try {
    const redis = launch(config.runtime.redisBinary, ['--bind', '127.0.0.1', '--port', String(redisPort), '--save', '', '--appendonly', 'no'], 'redis');
    const runtime = config.runtime.dynamodb;
    const ddb = launch(runtime.javaBinaryPath, [`-Djava.library.path=${runtime.libPath}`, '-cp', runtime.classPath, runtime.launcherClass, '-inMemory', '-sharedDb', '-port', String(ddbPort)], 'dynamodb');
    await Promise.all([waitForPort(redisPort, redis), waitForPort(ddbPort, ddb)]);
    const redisUrl = `redis://127.0.0.1:${redisPort}`;
    const ddbUrl = `http://127.0.0.1:${ddbPort}`;
    return { close, env: cleanTestEnv({
      IDV_SOCIAL_E2E_DDB_ENDPOINT_URL: ddbUrl, DDB_ENDPOINT_URL: ddbUrl,
      IRLINFRA__DDB_ENDPOINT_URL: ddbUrl,
      IDV_SOCIAL_E2E_CORE_VALKEY_URL: redisUrl, IDV_SOCIAL_E2E_MEMBERSHIP_VALKEY_URL: redisUrl,
      IDV_SOCIAL_E2E_MATCH_VALKEY_URL: redisUrl, CORE_VALKEY_URL: redisUrl,
      MEMBERSHIP_VALKEY_URL: redisUrl, MATCH_VALKEY_URL: redisUrl, GAMEPLAY_VALKEY_URL: redisUrl, REDIS_URL: redisUrl,
    }), ports: { redis: redisPort, dynamodb: ddbPort } };
  } catch (error) { await close(); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [backendRoot, fixtureDir, configPath] = process.argv.slice(2);
  if (!backendRoot || !fixtureDir || !configPath) console.log('Usage: node benchmarks/backend-testing/fixture.mjs <backend-root> <private-fixture-dir> <private-config.json>');
  else console.log(JSON.stringify(await prepareFixture({ backendRoot, fixtureDir, configPath }), null, 2));
}
