import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', rejectRun);
    child.on('close', (exitCode) => resolveRun({ exitCode, stdout, stderr }));
  });
}

export async function comparePng(referencePath, candidatePath, diffPath, thresholds) {
  const magick = process.env.WATER_RIPPLES_MAGICK_PATH || '/opt/homebrew/bin/magick';
  await mkdir(dirname(diffPath), { recursive: true });
  const metric = await run(magick, ['compare', '-metric', 'RMSE', referencePath, candidatePath, 'null:']);
  const match = metric.stderr.match(/\(([^)]+)\)/);
  if (!match || !Number.isFinite(Number(match[1]))) {
    return {
      status: 'NO_SIGNAL',
      normalizedRmse: null,
      reason: `ImageMagick RMSE was unavailable: ${metric.stderr.trim() || metric.stdout.trim()}`,
      commandExitCode: metric.exitCode,
      diffPath: null
    };
  }
  const normalizedRmse = Number(match[1]);
  const diff = await run(magick, [
    'compare',
    '-compose', 'src',
    '-highlight-color', '#ff235d',
    '-lowlight-color', '#10131a',
    referencePath,
    candidatePath,
    diffPath
  ]);
  const status = normalizedRmse <= thresholds.passRmse
    ? 'PASS'
    : normalizedRmse <= thresholds.reviewRmse
      ? 'REVIEW_REQUIRED'
      : 'VETO';
  return {
    status,
    normalizedRmse,
    thresholds,
    commandExitCode: metric.exitCode,
    diffCommandExitCode: diff.exitCode,
    diffPath
  };
}
