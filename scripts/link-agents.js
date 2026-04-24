#!/usr/bin/env node
/**
 * @fileoverview Link `.agents/skills` into local LLM tooling folders.
 *
 * @description
 * This repo keeps canonical agent skills under `.agents/skills/`. Some local tools (Claude Code + Codex CLI) expect a
 * `skills/` directory at tool-specific locations. This script creates/repairs symlinks so those tools share the same
 * canonical skills without duplicating files.
 *
 * Primary outcomes:
 * - `.claude/skills` → `.agents/skills`
 * - `.codex/skills`  → `.agents/skills`
 *
 * Optional hygiene outcomes (repo-recommended):
 * - Ensure tool-local preference files are gitignored.
 * - Ensure attributes contain stable symlink-handling hints for cross-platform checkouts.
 *
 * Safety & idempotency:
 * - Running multiple times should converge to the same state.
 * - Refuses to delete non-empty directories/files unless `--force` is provided.
 * - In `--dry-run`, performs no filesystem or `git config` writes.
 *
 * Usage:
 * - `node scripts/link-agents.js`
 * - `node scripts/link-agents.js --dry-run`
 *
 * Flags:
 * - `--dry-run`: Print actions without writing.
 * - `--check`: Like `--dry-run`, but exits non-zero if anything is out of date (CI/pre-commit friendly).
 * - `--force`: Replace non-empty targets (dangerous).
 * - `--no-gitignore`: Skip `.gitignore` edits.
 * - `--no-gitattributes`: Skip `.gitattributes` edits.
 * - `--no-git-config`: Skip any `git config` mutation (Windows-only).
 *
 * @see `.agents/skills/*`
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { c, glyph, padRight, printLine } from './ui/index.js';

const uiDividerWidthCharacters = 54;
const uiDividerLine = c.stone(glyph.divider.repeat(uiDividerWidthCharacters));
const uiLabelColumnWidthCharacters = 20;

const scriptDirectoryAbsolutePath = path.dirname(fileURLToPath(import.meta.url));
const repoRootAbsolutePath = path.resolve(scriptDirectoryAbsolutePath, '..');

const skillsSourceDirectoryRelativePathFromRepoRoot = path.join('.agents', 'skills');
const skillsSymlinkTargetRelativePathsFromRepoRoot = [
  path.join('.claude', 'skills'),
  path.join('.codex', 'skills'),
];

const requiredGitignoreLines = [
  "# Tool-local config (don't commit)",
  '.claude/settings.local.json',
  '.codex/config.local.toml',
];

const requiredGitattributesLines = [
  '# Ensure symlinks are preserved across platforms',
  '.claude/skills symlink=true',
  '.codex/skills symlink=true',
];

function printHelp() {
  // Keep this intentionally dependency-free (no Commander) because this script is a tiny local workflow helper.
  console.log(`
link-agents.js — link canonical agent skills into local tooling folders

Usage:
  node scripts/link-agents.js [options]

Options:
  --dry-run             Print actions without writing
  --check               Exit non-zero if changes are needed (implies --dry-run)
  --force               Replace non-empty targets (dangerous)
  --no-gitignore         Skip .gitignore edits
  --no-gitattributes     Skip .gitattributes edits
  --no-git-config        Skip git config mutation (Windows-only)
  --help                Show this help
`);
}

function parseCommandLineOptions(rawArguments) {
  /** @type {{ dryRun: boolean; check: boolean; force: boolean; updateGitignore: boolean; updateGitattributes: boolean; updateGitConfig: boolean }} */
  const options = {
    dryRun: false,
    check: false,
    force: false,
    updateGitignore: true,
    updateGitattributes: true,
    updateGitConfig: true,
  };

  for (const rawArgument of rawArguments) {
    if (rawArgument === '--help' || rawArgument === '-h') {
      printHelp();
      process.exit(0);
    }

    if (rawArgument === '--dry-run' || rawArgument === '--check') {
      options.dryRun = true;
      if (rawArgument === '--check') {
        options.check = true;
      }
      continue;
    }

    if (rawArgument === '--force') {
      options.force = true;
      continue;
    }

    if (rawArgument === '--no-gitignore') {
      options.updateGitignore = false;
      continue;
    }

    if (rawArgument === '--no-gitattributes') {
      options.updateGitattributes = false;
      continue;
    }

    if (rawArgument === '--no-git-config') {
      options.updateGitConfig = false;
      continue;
    }

    console.error(`${glyph.error} Unknown argument: ${rawArgument}`);
    printHelp();
    process.exit(1);
  }

  return options;
}

function renderOutcomeSymbol(outcomeType) {
  if (outcomeType === 'ok') {
    return c.ok(glyph.ok);
  }
  if (outcomeType === 'warn') {
    return c.warn(glyph.warn);
  }
  if (outcomeType === 'error') {
    return c.error(glyph.error);
  }
  return c.dim(glyph.bullet);
}

function printOutcomeLine({ outcomeType, label, message }) {
  const safeLabel = typeof label === 'string' ? label : '';
  const safeMessage = typeof message === 'string' ? message : '';
  const labelText = padRight(c.ink(safeLabel), uiLabelColumnWidthCharacters);
  printLine(`  ${renderOutcomeSymbol(outcomeType)} ${labelText} ${safeMessage}`);
}

function normalizeAbsolutePathForComparison(absolutePath) {
  const normalizedAbsolutePath = path.normalize(absolutePath);
  return process.platform === 'win32' ? normalizedAbsolutePath.toLowerCase() : normalizedAbsolutePath;
}

function resolveSymlinkTargetAbsolutePath({ symlinkParentDirectoryAbsolutePath, symlinkTargetPath }) {
  if (path.isAbsolute(symlinkTargetPath)) {
    return symlinkTargetPath;
  }
  return path.resolve(symlinkParentDirectoryAbsolutePath, symlinkTargetPath);
}

function readUtf8FileOrEmpty(fileAbsolutePath) {
  try {
    return fs.readFileSync(fileAbsolutePath, 'utf8');
  } catch (readError) {
    if (readError && typeof readError === 'object' && readError.code === 'ENOENT') {
      return '';
    }
    throw readError;
  }
}

function writeUtf8FileIfChanged({ fileAbsolutePath, nextContent, shouldWrite }) {
  const previousContent = readUtf8FileOrEmpty(fileAbsolutePath);
  if (previousContent === nextContent) {
    return { changed: false };
  }

  if (!shouldWrite) {
    return { changed: true };
  }

  fs.writeFileSync(fileAbsolutePath, nextContent, 'utf8');
  return { changed: true };
}

function ensureLinesInTextFile({ fileRelativePathFromRepoRoot, requiredLinesToAppend, shouldWrite }) {
  const fileAbsolutePath = path.join(repoRootAbsolutePath, fileRelativePathFromRepoRoot);
  const existingContent = readUtf8FileOrEmpty(fileAbsolutePath);
  const existingLines = existingContent.split(/\r?\n/);
  const existingLinesSet = new Set(existingLines);

  const missingLines = requiredLinesToAppend.filter((line) => !existingLinesSet.has(line));
  if (missingLines.length === 0) {
    printOutcomeLine({ outcomeType: 'ok', label: fileRelativePathFromRepoRoot, message: c.dim('already up to date') });
    return { changed: false };
  }

  let nextContent = existingContent;
  if (nextContent.length > 0 && !nextContent.endsWith('\n')) {
    nextContent += '\n';
  }
  if (nextContent.length > 0 && !nextContent.endsWith('\n\n')) {
    nextContent += '\n';
  }
  nextContent += `${missingLines.join('\n')}\n`;

  const writeResult = writeUtf8FileIfChanged({ fileAbsolutePath, nextContent, shouldWrite });
  if (!shouldWrite) {
    printOutcomeLine({
      outcomeType: 'warn',
      label: fileRelativePathFromRepoRoot,
      message: `${c.warn(`+${missingLines.length}`)} ${c.dim('line(s) to append (dry-run)')}`,
    });
    for (const missingLine of missingLines) {
      const formattedLine = missingLine.trim().startsWith('#') ? c.dim(missingLine) : c.frost(missingLine);
      printLine(`      ${c.dim(glyph.bullet)} ${formattedLine}`);
    }
    return writeResult;
  }

  printOutcomeLine({
    outcomeType: 'ok',
    label: fileRelativePathFromRepoRoot,
    message: `${c.ok(`+${missingLines.length}`)} ${c.dim('line(s) appended')}`,
  });
  return writeResult;
}

function ensureDirectoryExists({ directoryAbsolutePath, shouldWrite }) {
  if (fs.existsSync(directoryAbsolutePath)) {
    return { created: false };
  }

  if (shouldWrite) {
    fs.mkdirSync(directoryAbsolutePath, { recursive: true });
  }
  return { created: true };
}

function isDirectoryEmpty(directoryAbsolutePath) {
  const entries = fs.readdirSync(directoryAbsolutePath);
  return entries.length === 0;
}

function tryGetGitLocalConfigValue({ configKey }) {
  try {
    const stdout = execFileSync('git', ['config', '--local', configKey], {
      cwd: repoRootAbsolutePath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, value: stdout.trim() };
  } catch (error) {
    const exitCode = typeof error?.status === 'number' ? error.status : null;
    if (exitCode === 1) {
      return { ok: true, value: null };
    }
    return { ok: false, error };
  }
}

function trySetGitLocalConfigValue({ configKey, configValue, shouldWrite }) {
  if (!shouldWrite) {
    return { ok: true, didWrite: false };
  }

  try {
    execFileSync('git', ['config', '--local', configKey, configValue], {
      cwd: repoRootAbsolutePath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, didWrite: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function ensureWindowsGitCoreSymlinksEnabled({ shouldWrite }) {
  const label = 'git core.symlinks';

  const currentValueResult = tryGetGitLocalConfigValue({ configKey: 'core.symlinks' });
  if (!currentValueResult.ok) {
    printOutcomeLine({ outcomeType: 'warn', label, message: c.dim('unable to read (skipping)') });
    return { changed: false };
  }

  if (currentValueResult.value === 'true') {
    printOutcomeLine({ outcomeType: 'ok', label, message: c.dim('already true') });
    return { changed: false };
  }

  const setResult = trySetGitLocalConfigValue({ configKey: 'core.symlinks', configValue: 'true', shouldWrite });
  if (!setResult.ok) {
    printOutcomeLine({ outcomeType: 'warn', label, message: c.dim('failed to set (run manually if needed)') });
    return { changed: false };
  }

  if (!shouldWrite) {
    printOutcomeLine({ outcomeType: 'warn', label, message: c.dim('would set to true (dry-run)') });
    return { changed: true };
  }

  printOutcomeLine({ outcomeType: 'ok', label, message: c.ok('set to true') });
  return { changed: true };
}

function ensureDirectorySymlink({
  symlinkRelativePathFromRepoRoot,
  symlinkAbsolutePath,
  targetDirectoryAbsolutePath,
  shouldWrite,
  forceReplaceNonEmptyTargets,
}) {
  const symlinkParentDirectoryAbsolutePath = path.dirname(symlinkAbsolutePath);
  const expectedSymlinkTargetPathRelativeToSymlinkParent = path.relative(
    symlinkParentDirectoryAbsolutePath,
    targetDirectoryAbsolutePath,
  );

  ensureDirectoryExists({ directoryAbsolutePath: symlinkParentDirectoryAbsolutePath, shouldWrite });

  const expectedTargetNormalized = normalizeAbsolutePathForComparison(targetDirectoryAbsolutePath);
  const label = symlinkRelativePathFromRepoRoot;
  const arrow = c.dim(glyph.arrow);
  const expectedTargetText = c.frost(expectedSymlinkTargetPathRelativeToSymlinkParent);

  try {
    const existingStat = fs.lstatSync(symlinkAbsolutePath);

    if (existingStat.isSymbolicLink()) {
      const existingSymlinkTargetRaw = fs.readlinkSync(symlinkAbsolutePath);
      const existingSymlinkTargetAbsolutePath = resolveSymlinkTargetAbsolutePath({
        symlinkParentDirectoryAbsolutePath,
        symlinkTargetPath: existingSymlinkTargetRaw,
      });
      const existingTargetNormalized = normalizeAbsolutePathForComparison(existingSymlinkTargetAbsolutePath);

      if (existingTargetNormalized === expectedTargetNormalized) {
        printOutcomeLine({
          outcomeType: 'ok',
          label,
          message: `${c.dim('already linked')} ${arrow} ${expectedTargetText}`,
        });
        return { changed: false };
      }

      if (!shouldWrite) {
        printOutcomeLine({
          outcomeType: 'warn',
          label,
          message: `${c.dim('would relink (dry-run)')} ${arrow} ${expectedTargetText}`,
        });
        return { changed: true };
      }

      fs.unlinkSync(symlinkAbsolutePath);
    } else if (existingStat.isDirectory()) {
      const empty = isDirectoryEmpty(symlinkAbsolutePath);
      const canReplaceDirectory = empty || forceReplaceNonEmptyTargets;
      if (!canReplaceDirectory) {
        printOutcomeLine({
          outcomeType: 'warn',
          label,
          message: c.dim('exists as non-empty directory (skipping)'),
        });
        return { changed: false, needsManualIntervention: true };
      }

      if (!shouldWrite) {
        printOutcomeLine({
          outcomeType: 'warn',
          label,
          message: `${c.dim(`would replace ${empty ? 'empty' : 'non-empty'} directory (dry-run)`)} ${arrow} ${expectedTargetText}`,
        });
        return { changed: true };
      }

      fs.rmSync(symlinkAbsolutePath, { recursive: true, force: true });
    } else {
      if (!forceReplaceNonEmptyTargets) {
        printOutcomeLine({ outcomeType: 'warn', label, message: c.dim('exists and is not a symlink (skipping)') });
        return { changed: false, needsManualIntervention: true };
      }

      if (!shouldWrite) {
        printOutcomeLine({
          outcomeType: 'warn',
          label,
          message: `${c.dim('would replace non-symlink target (dry-run)')} ${arrow} ${expectedTargetText}`,
        });
        return { changed: true };
      }

      fs.rmSync(symlinkAbsolutePath, { recursive: true, force: true });
    }
  } catch (statError) {
    if (!(statError && typeof statError === 'object' && statError.code === 'ENOENT')) {
      throw statError;
    }
  }

  if (!shouldWrite) {
    printOutcomeLine({
      outcomeType: 'warn',
      label,
      message: `${c.dim('would link (dry-run)')} ${arrow} ${expectedTargetText}`,
    });
    return { changed: true };
  }

  try {
    fs.symlinkSync(expectedSymlinkTargetPathRelativeToSymlinkParent, symlinkAbsolutePath, 'junction');
    printOutcomeLine({ outcomeType: 'ok', label, message: `${c.ok('linked')} ${arrow} ${expectedTargetText}` });
    return { changed: true, needsManualIntervention: false };
  } catch (createSymlinkError) {
    if (createSymlinkError && typeof createSymlinkError === 'object' && createSymlinkError.code === 'EPERM') {
      printOutcomeLine({
        outcomeType: 'error',
        label,
        message: c.error('permission denied (Windows: enable Developer Mode or run as admin)'),
      });
      process.exitCode = 1;
      return { changed: false, needsManualIntervention: true };
    }
    throw createSymlinkError;
  }
}

function main() {
  const options = parseCommandLineOptions(process.argv.slice(2));
  const shouldWrite = !options.dryRun;
  const checkModeEnabled = options.check;
  let checkHasFailures = false;

  const skillsSourceDirectoryAbsolutePath = path.join(repoRootAbsolutePath, skillsSourceDirectoryRelativePathFromRepoRoot);
  if (!fs.existsSync(skillsSourceDirectoryAbsolutePath)) {
    console.error(`${glyph.error} Missing source directory: ${skillsSourceDirectoryRelativePathFromRepoRoot}`);
    console.error(`${glyph.error} Expected: ${skillsSourceDirectoryAbsolutePath}`);
    process.exit(1);
  }

  printLine('');
  printLine(`  ${c.hearth('Idavoll')} ${c.frost('Agent Skills')}`);
  if (checkModeEnabled) {
    printLine(`  ${c.silver(glyph.step)} ${c.silver('Check')} ${c.dim(glyph.bullet)} ${c.dim('no writes')}`);
  } else if (options.dryRun) {
    printLine(`  ${c.warn(glyph.warn)} ${c.warn('Dry run')} ${c.dim(glyph.bullet)} ${c.dim('no writes')}`);
  } else {
    printLine(`  ${c.ok(glyph.ok)} ${c.ok('Linking')} ${c.dim(glyph.bullet)} ${c.dim('idempotent')}`);
  }
  printLine(`  ${c.dim('Source:')} ${c.frost(skillsSourceDirectoryRelativePathFromRepoRoot)}`);
  printLine(`  ${uiDividerLine}`);
  printLine('');

  if (options.updateGitConfig && process.platform === 'win32') {
    printLine(`  ${c.silver('Git')}`);
    printLine('');
    const gitConfigResult = ensureWindowsGitCoreSymlinksEnabled({ shouldWrite });
    if (checkModeEnabled && gitConfigResult.changed) {
      checkHasFailures = true;
    }
    printLine('');
  }

  if (options.updateGitattributes || options.updateGitignore) {
    printLine(`  ${c.silver('Hygiene')}`);
    printLine('');
  }

  if (options.updateGitattributes) {
    const gitattributesResult = ensureLinesInTextFile({
      fileRelativePathFromRepoRoot: '.gitattributes',
      requiredLinesToAppend: requiredGitattributesLines,
      shouldWrite,
    });
    if (checkModeEnabled && gitattributesResult.changed) {
      checkHasFailures = true;
    }
  }

  if (options.updateGitignore) {
    const gitignoreResult = ensureLinesInTextFile({
      fileRelativePathFromRepoRoot: '.gitignore',
      requiredLinesToAppend: requiredGitignoreLines,
      shouldWrite,
    });
    if (checkModeEnabled && gitignoreResult.changed) {
      checkHasFailures = true;
    }
  }

  if (options.updateGitattributes || options.updateGitignore) {
    printLine('');
  }

  printLine(`  ${c.silver('Symlinks')}`);
  printLine('');
  for (const symlinkRelativePathFromRepoRoot of skillsSymlinkTargetRelativePathsFromRepoRoot) {
    const symlinkAbsolutePath = path.join(repoRootAbsolutePath, symlinkRelativePathFromRepoRoot);
    const symlinkResult = ensureDirectorySymlink({
      symlinkRelativePathFromRepoRoot,
      symlinkAbsolutePath,
      targetDirectoryAbsolutePath: skillsSourceDirectoryAbsolutePath,
      shouldWrite,
      forceReplaceNonEmptyTargets: options.force,
    });
    if (checkModeEnabled && (symlinkResult.changed || symlinkResult.needsManualIntervention)) {
      checkHasFailures = true;
    }
  }

  printLine('');
  printLine(`  ${uiDividerLine}`);
  if (checkModeEnabled) {
    if (checkHasFailures || process.exitCode === 1) {
      process.exitCode = 1;
      printLine(
        `  ${c.error(glyph.error)} ${c.error('Check failed.')} ${c.dim('Run')} ${c.frost('node scripts/link-agents.js')} ${c.dim('to apply fixes.')}`,
      );
    } else {
      printLine(`  ${c.ok(glyph.ok)} ${c.ok('Check passed.')} ${c.dim('Everything is linked and up to date.')}`);
    }
  } else if (options.dryRun) {
    printLine(
      `  ${c.warn(glyph.warn)} ${c.warn('Dry-run complete.')} ${c.dim('Re-run without')} ${c.frost('--dry-run')} ${c.dim('to apply.')}`,
    );
  } else {
    printLine(`  ${c.ok(glyph.ok)} ${c.ok('Done.')} ${c.dim('Re-run anytime — it is idempotent.')}`);
  }
  printLine('');
}

main();
