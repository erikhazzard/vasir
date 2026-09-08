#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const frozen = join(repo, 'docs/work/vasir-benchmarking/ash-and-echo/evidence/revision-23');
const original = join(repo, 'site/ash-and-echo');
const output = join(repo, '.agents/vasir-evals/2d-jumping-demo/reference-r23');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = async path => {
  const bytes = await readFile(path);
  return { path: relative(repo, path), bytes: bytes.length, sha256: sha256(bytes) };
};
await mkdir(join(output, 'runtime/assets'), { recursive: true });
const files = [];
for (const name of (await readdir(join(frozen, 'source'))).sort()) {
  if (!/\.(js|html|css)$/.test(name)) continue;
  const bytes = await readFile(join(frozen, 'source', name));
  if (sha256(bytes) !== sha256(await readFile(join(original, name)))) throw new Error(`Reference runtime changed: ${name}`);
  await writeFile(join(output, 'runtime', name), bytes);
  files.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
}
const assetHashes = JSON.parse(await readFile(join(frozen, 'asset-identities.json')));
for (const [name, expected] of Object.entries(assetHashes).sort()) {
  if (!/\.(png|webp|jpg|jpeg|woff2|ogg|mp3|wav)$/.test(name)) continue;
  const bytes = await readFile(join(original, 'assets', name));
  if (sha256(bytes) !== expected) throw new Error(`Reference asset changed: ${name}`);
  await writeFile(join(output, 'runtime/assets', name), bytes);
  files.push({ path: `assets/${name}`, bytes: bytes.length, sha256: expected });
}
const video = join(output, 'play.mp4');
const transcoded = spawnSync('/opt/homebrew/bin/ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(frozen, 'play/full-climb.webm'), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video], { encoding: 'utf8' });
if (transcoded.status !== 0) throw new Error(transcoded.stderr);
await copyFile(join(frozen, 'play/04-resonant-stone.png'), join(output, 'poster.png'));
const reference = {
  id: 'ash-and-echo-r23', label: 'Ash & Echo · guided reference',
  provenance: 'Creator-accepted revision 23 after extensive human-directed Astra development and repeated craft revisions. This historical reference is not a fresh single-prompt trial and has no competitive score. Recorded keyboard play; silent video. Its lessons informed the Vasir skills used in this pilot.',
  bundle: { root: relative(repo, join(output, 'runtime')), entrypoint: 'index.html', files },
  video: await pin(video), poster: await pin(join(output, 'poster.png')), width: 390, height: 844,
  originalVideo: await pin(join(frozen, 'play/full-climb.webm'))
};
await writeFile(join(output, 'reference.json'), `${JSON.stringify(reference, null, 2)}\n`);
console.log(JSON.stringify({ reference: relative(repo, join(output, 'reference.json')), runtimeFiles: files.length, runtimeBytes: files.reduce((sum, file) => sum + file.bytes, 0), videoBytes: reference.video.bytes }));
