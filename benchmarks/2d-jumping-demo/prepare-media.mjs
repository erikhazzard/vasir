#!/usr/bin/env node
// Preserve normal-time observed play. Only leading operator setup may be removed.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [captureArgument, buildArgument, outputArgument] = process.argv.slice(2);
if (!outputArgument) throw new Error('Usage: prepare-media.mjs <capture.json> <build-receipt.json> <output-directory>');
const capturePath = resolve(captureArgument); const buildPath = resolve(buildArgument); const output = resolve(outputArgument);
const capture = JSON.parse(await readFile(capturePath)); const build = JSON.parse(await readFile(buildPath));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = entries => JSON.stringify(entries.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })).sort((a, b) => a.path.localeCompare(b.path)));
const check = (condition, text) => { if (!condition) throw new Error(text); };
check(build.kind === 'vasir-game-build-receipt' && build.exitCode === 0, 'No successful package receipt.');
check(capture.inputArtifactHash === build.inputArtifactHash && capture.packageVerifiedAfterCapture && normalize(capture.package.entries) === normalize(build.output.entries), 'Capture is not bound to this package.');
check(capture.responses.some(response => response.matchesPackage && response.path.endsWith('.html')) && !capture.responses.some(response => response.matchesPackage === false), 'Observed runtime did not match the package.');
const pin = async path => { const bytes = await readFile(path); return { path: relative(repo, path).split('\\').join('/'), bytes: bytes.length, sha256: digest(bytes) }; };
for (const file of build.output.entries) {
  const observed = await pin(join(build.output.directory, file.path));
  check(observed.sha256 === file.sha256 && observed.bytes === file.bytes, `Package changed: ${file.path}`);
}
const ffmpeg = argv => { const result = spawnSync('/opt/homebrew/bin/ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', ...argv], { encoding: 'utf8', timeout: 180000 }); if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'ffmpeg failed'); };
const probe = spawnSync('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', capture.originalVideo], { encoding: 'utf8' });
check(probe.status === 0, 'Original capture cannot be decoded.');
const originalDuration = Number(JSON.parse(probe.stdout).format.duration);
const firstInput = capture.actions.find(action => ['tap', 'click', 'touch', 'key', 'reload'].includes(action.action))?.atSeconds ?? 0;
const start = Math.max(0, firstInput - 1);
const duration = Math.min(90, originalDuration - start);
check(duration > 0, 'Capture has no duration after input.');
await mkdir(output, { recursive: true });
const videoPath = join(output, 'play.mp4');
ffmpeg(['-i', capture.originalVideo, '-ss', String(start), '-t', String(duration), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', videoPath]);
// The representative poster always comes from five seconds into the clip.
const posterTime = Math.min(5, duration / 2);
const posterPath = join(output, 'poster.png');
ffmpeg(['-ss', String(posterTime), '-i', videoPath, '-frames:v', '1', posterPath]);
const frames = [];
const count = Math.min(13, Math.max(2, Math.ceil(duration / 7.5)));
for (let index = 0; index < count; index++) {
  const atSeconds = Number((Math.min(duration - 0.05, index * duration / count)).toFixed(3));
  const id = `frame-${String(index).padStart(2, '0')}`; const path = join(output, `${id}.png`);
  ffmpeg(['-ss', String(atSeconds), '-i', videoPath, '-frames:v', '1', path]);
  frames.push({ id, ...await pin(path), atSeconds });
}
const receipt = {
  kind: 'vasir-game-media-receipt', schemaVersion: 1, artifactHash: build.inputArtifactHash,
  ...(build.synthetic ? { synthetic: true } : {}),
  package: { root: relative(repo, build.output.directory), entries: build.output.entries.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })) },
  capture: await pin(capturePath), originalVideo: await pin(capture.originalVideo),
  video: await pin(videoPath), poster: await pin(posterPath), frames,
  edit: { speed: 1, startSeconds: start, durationSeconds: duration, originalDurationSeconds: originalDuration, audio: 'silent browser capture', rule: 'Remove only setup before one second preceding first input; retain the next 90 seconds or remaining duration including mistakes and recovery. Poster at five seconds; evenly sampled frames. Full original and input trace retained.' },
  limitations: ['Mobile browser emulation; not physical phone testing.', 'No recorded audio assessment.']
};
await writeFile(join(output, 'media-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ receipt: relative(repo, join(output, 'media-receipt.json')), start, duration, frames: frames.length }));
