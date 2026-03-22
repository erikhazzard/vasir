/**
 * @fileoverview Norse Design System — Color Application
 *
 * @description
 * Provides the raw `paint()` function and the semantic `c` color API that all CLI consumers
 * should use. The `c` object maps design intent to ANSI codes — consumers never touch raw
 * color numbers.
 *
 * Architecture & Lifecycle:
 * - Trigger: Imported at module load by all UI surfaces.
 * - Scope: Static Utility.
 *
 * Usage & Policy:
 * - Strict Rule: Consumer code should use `c.frost('text')`, never `paint(text, ansi.fg256(153))`.
 * - Access: `import { c, paint } from '../ui/paint.js'` or via `../ui/index.js`.
 *
 * Dependencies:
 * - Upstream: None.
 * - Downstream: Every CLI surface that outputs colored text.
 *
 * Critical Constraints:
 * - Performance: Each `c.*()` call is a thin wrapper — no allocations beyond string concat.
 *
 * @see {@link theme}
 * @see {@link ansi}
 */

import { ansi, supportsColor } from './ansi.js';
import { theme } from './theme.js';

export function paint(text, ...codes) {
  if (!supportsColor()) {
    return String(text);
  }
  return `${codes.join('')}${String(text)}${ansi.reset}`;
}

// why: `paintOn` allows callers to specify the stream for color detection (e.g. stdout for panels).
export function paintOn(stream, text, ...codes) {
  if (!supportsColor(stream)) {
    return String(text);
  }
  return `${codes.join('')}${String(text)}${ansi.reset}`;
}

// why: Semantic color API — the ONLY color interface consumers should use.
// Named after what the color *means*, not what it looks like.
export const c = Object.freeze({
  // Text hierarchy
  ink:     (text) => paint(text, ansi.fg256(theme.ink)),
  muted:   (text) => paint(text, ansi.fg256(theme.muted)),
  dim:     (text) => paint(text, ansi.fg256(theme.dim)),
  subtle:  (text) => paint(text, ansi.fg256(theme.subtle)),

  // Cool accents
  frost:   (text) => paint(text, ansi.bold, ansi.fg256(theme.frost)),
  silver:  (text) => paint(text, ansi.fg256(theme.silver)),
  steel:   (text) => paint(text, ansi.fg256(theme.steel)),

  // Warm accent (sparingly)
  hearth:  (text) => paint(text, ansi.bold, ansi.fg256(theme.hearth)),

  // Status
  ok:      (text) => paint(text, ansi.bold, ansi.fg256(theme.success)),
  warn:    (text) => paint(text, ansi.fg256(theme.warn)),
  error:   (text) => paint(text, ansi.bold, ansi.fg256(theme.error)),
  info:    (text) => paint(text, ansi.fg256(theme.info)),

  // Structure
  stone:   (text) => paint(text, ansi.fg256(theme.stone)),
  rune:    (text) => paint(text, ansi.fg256(theme.rune)),
  aurora:  (text) => paint(text, ansi.fg256(theme.aurora)),

  // Emphasis
  bold:    (text) => paint(text, ansi.bold),
  header:  (text) => paint(text, ansi.bold, ansi.fg256(theme.frost)),
});
