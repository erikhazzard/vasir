/**
 * @fileoverview Norse Design System — Canonical Symbol Set
 *
 * @description
 * Single source of truth for all glyphs, icons, and symbols used in CLI output.
 * Norse-appropriate and restrained: no block fills, no neon dots.
 *
 * Architecture & Lifecycle:
 * - Trigger: Imported at module load by CLI surfaces.
 * - Scope: Static constants (frozen object).
 *
 * Usage & Policy:
 * - Strict Rule: All symbolic output MUST use these constants. No inline Unicode elsewhere.
 * - Access: `import { glyph } from '../ui/glyphs.js'` or via `../ui/index.js`.
 *
 * Dependencies:
 * - Upstream: None (leaf module).
 * - Downstream: {@link log}, {@link startupUi}, and all CLI surfaces.
 *
 * @see {@link theme}
 */

export const glyph = Object.freeze({
  // Status indicators
  ok:       '\u25C6',  // ◆ filled diamond — success, ready, published
  error:    '\u2717',  // ✗ ballot x — failure
  warn:     '\u25B2',  // ▲ triangle — warning, caution
  pending:  '\u25CB',  // ○ open circle — waiting, unpublished
  active:   '\u25C7',  // ◇ open diamond — in progress

  // Navigation / flow
  arrow:    '\u203A',  // › single right angle — breadcrumb, detail
  pointer:  '\u25B8',  // ▸ small right triangle — prompt pointer
  dash:     '\u2014',  // — em dash — separator

  // List markers
  bullet:   '\u00B7',  // · middle dot — list items, info-level log
  step:     '\u25AA',  // ▪ small filled square — step marker

  // Dividers
  divider:  '\u2500',  // ─ light horizontal — section separators

  // Spinner frames (braille — neutral, works everywhere)
  spinner: Object.freeze([
    '\u280B', '\u2819', '\u2839', '\u2838',
    '\u283C', '\u2834', '\u2826', '\u2827',
    '\u2807', '\u280F',
  ]),
});
