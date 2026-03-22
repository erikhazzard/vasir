/**
 * @fileoverview Norse Design System — ANSI Primitives
 *
 * @description
 * Single source of truth for ANSI escape codes, TTY/color detection, and ANSI stripping.
 * Replaces 7+ independent copies scattered across the codebase.
 *
 * Architecture & Lifecycle:
 * - Trigger: Imported at module load by {@link paint}, {@link log}, and all UI modules.
 * - Scope: Static Utility.
 *
 * Usage & Policy:
 * - Strict Rule: All ANSI escape code usage MUST go through this module. No inline `\u001b[...` elsewhere.
 * - Access: `import { ansi, supportsColor, stripAnsi } from '../ui/ansi.js'`.
 *
 * Dependencies:
 * - Upstream: None (leaf module).
 * - Downstream: {@link paint}, {@link log}, {@link layout}, and all CLI surfaces.
 *
 * Critical Constraints:
 * - Performance: `supportsColor()` caches its result per stream — computed once, then free.
 *
 * Notes & Trade-offs:
 * - Respects `NO_COLOR` env var (https://no-color.org/).
 * - TTY detection checks the specific stream (stderr for logs, stdout for UI panels).
 *
 * @see {@link paint}
 */

export const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

export const ansi = Object.freeze({
  reset:     '\u001b[0m',
  bold:      '\u001b[1m',
  dim:       '\u001b[2m',
  italic:    '\u001b[3m',
  underline: '\u001b[4m',
  clearLine: '\u001b[2K',
  hideCursor:'\u001b[?25l',
  showCursor:'\u001b[?25h',
  carriageReturn: '\r',
  fg256:     (colorIndex) => `\u001b[38;5;${colorIndex}m`,
  bg256:     (colorIndex) => `\u001b[48;5;${colorIndex}m`,
});

// why: Cache per-stream to avoid repeated isTTY / env lookups. WeakMap keyed by stream object.
const colorSupportCache = new WeakMap();

export function supportsColor(stream) {
  const target = stream || process.stderr;
  if (colorSupportCache.has(target)) {
    return colorSupportCache.get(target);
  }
  const supported = Boolean(target.isTTY && !process.env.NO_COLOR);
  colorSupportCache.set(target, supported);
  return supported;
}

export function stripAnsi(text) {
  return String(text || '').replace(ANSI_PATTERN, '');
}
