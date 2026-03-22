/**
 * @fileoverview Norse Design System — Logger
 *
 * @description
 * Structured, human-readable logger for the `idv` CLI. Replaces the previous logger
 * with proper level support (debug/info/warn/error) and `--verbose` gating for detail JSON.
 *
 * Key behavior change: details JSON is NEVER shown in normal mode. `--verbose` unlocks it.
 * This single change eliminates the noise that previously made `npm run start` output unreadable.
 *
 * Architecture & Lifecycle:
 * - Trigger: Called by CLI commands and supporting modules during execution.
 * - Scope: Static Utility.
 *
 * Usage & Policy:
 * - Precedence: Caller scope/message/details -> formatted line output.
 * - Strict Rule: Never log secrets/tokens/credentials; keep details bounded.
 * - Access: Use `logInfo`, `logWarn`, `logError`, `logDebug`, or `printLine`.
 *
 * Dependencies:
 * - Upstream: Tooling modules (local runtime, build/publish/promote, create wizard).
 * - Downstream: Node `process.stdout` / `process.stderr`.
 *
 * Critical Constraints:
 * - Performance: Avoid heavy formatting in hot loops.
 *
 * Notes & Trade-offs:
 * - `logDebug` is completely silent unless `setVerbose(true)` has been called.
 * - Non-TTY output uses bracketed format `[LEVEL] [scope] message` for CI/log parsing.
 *
 * @see {@link theme}
 */

import { ansi, supportsColor, stripAnsi } from './ansi.js';
import { theme } from './theme.js';
import { glyph } from './glyphs.js';

let verboseEnabled = false;

// why: When the fullscreen dashboard is active, all log output must be suppressed to avoid
// corrupting the alt-screen buffer. The dashboard captures deploy events via its callback.
let logSuppressed = false;

export function setVerbose(enabled) {
  verboseEnabled = Boolean(enabled);
}

export function isVerbose() {
  return verboseEnabled;
}

export function setLogSuppressed(suppressed) {
  logSuppressed = Boolean(suppressed);
}

export function isLogSuppressed() {
  return logSuppressed;
}

function writeLine(stream, line) {
  stream.write(`${line}\n`);
}

function normalizeNewlines(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

const levelMeta = {
  debug: { symbol: glyph.bullet, color: theme.dim },
  info:  { symbol: glyph.bullet, color: theme.steel },
  warn:  { symbol: glyph.warn,   color: theme.warn },
  error: { symbol: glyph.error,  color: theme.error },
};

function logAtLevel(level, scope, message, details) {
  if (logSuppressed) {
    return;
  }
  const meta = levelMeta[level];
  const stream = process.stderr;

  // why: Details JSON is suppressed in normal mode. --verbose unlocks it.
  const shouldShowDetails = verboseEnabled && details;
  const detailsSuffix = shouldShowDetails ? ` ${JSON.stringify(details)}` : '';

  if (!supportsColor(stream)) {
    writeLine(stream, `[${level.toUpperCase()}] [${scope}] ${message}${detailsSuffix}`);
    return;
  }

  const normalizedMessage = normalizeNewlines(message);
  const messageLines = normalizedMessage.split('\n');
  const firstMessageLine = messageLines[0] ?? '';
  const trailingMessageLines = messageLines.slice(1);

  const symbolText = `${ansi.bold}${ansi.fg256(meta.color)}${meta.symbol}${ansi.reset}`;
  const scopeText = `${ansi.fg256(theme.dim)}${stripAnsi(scope)}${ansi.reset}`;
  const messageText = `${ansi.fg256(meta.color)}${stripAnsi(firstMessageLine)}${ansi.reset}`;
  const detailsText = shouldShowDetails ? `${ansi.fg256(theme.dim)}${detailsSuffix}${ansi.reset}` : '';

  writeLine(stream, `${symbolText} ${scopeText} ${messageText}${detailsText}`);

  if (trailingMessageLines.length > 0) {
    const indent = '  ';
    for (const line of trailingMessageLines) {
      if (line.trim().length === 0) {
        writeLine(stream, '');
        continue;
      }
      writeLine(stream, `${indent}${ansi.fg256(theme.ink)}${stripAnsi(line)}${ansi.reset}`);
    }
  }
}

export function logDebug(scope, message, details) {
  if (!verboseEnabled) {
    return;
  }
  logAtLevel('debug', scope, message, details);
}

export function logInfo(scope, message, details) {
  logAtLevel('info', scope, message, details);
}

export function logWarn(scope, message, details) {
  logAtLevel('warn', scope, message, details);
}

export function logError(scope, message, details) {
  logAtLevel('error', scope, message, details);
}

export function printLine(line) {
  if (logSuppressed) {
    return;
  }
  writeLine(process.stdout, line);
}
