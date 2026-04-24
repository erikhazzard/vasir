/**
 * @fileoverview Norse Design System — Color Palette
 *
 * @description
 * Canonical 256-color palette for all Idavoll CLI surfaces. Cool Norse aesthetic:
 * frost blues and silvers as the primary voice, stone greys for structure, sage greens
 * for success, and occasional hearth-gold for brand moments — like firelight in a frost hall.
 *
 * Architecture & Lifecycle:
 * - Trigger: Imported at module load by {@link paint} and all UI consumers.
 * - Scope: Static constants (frozen object).
 *
 * Usage & Policy:
 * - Precedence: Always use semantic tokens (not raw color codes) in consumer code.
 * - Strict Rule: Never add colors here without a semantic name. No "color5" or "accent2".
 * - Access: `import { theme } from '../ui/theme.js'` or via the barrel `../ui/index.js`.
 *
 * Dependencies:
 * - Upstream: None (leaf module).
 * - Downstream: {@link paint}, {@link log}, and every CLI surface.
 *
 * Critical Constraints:
 * - Ordering: None.
 * - Performance: Frozen object; zero runtime cost.
 *
 * Notes & Trade-offs:
 * - 256-color codes chosen for broad terminal support (iTerm2, Terminal.app, Windows Terminal,
 *   most Linux terminals). True color (24-bit) would allow finer tuning but risks compatibility.
 * - The palette is intentionally restrained: ~16 semantic tokens. More colors = less coherence.
 *
 * @see {@link paint}
 */

// why: Cool Norse palette — Skyrim energy, not cyberpunk. Frost blues and silvers dominate,
// with hearth-gold as the single warm accent (brand moments only). Stone grey for structure.
export const theme = Object.freeze({
  // --- Text hierarchy ---
  ink:       253,   // warm white — primary readable text
  muted:     249,   // light grey — secondary text, less emphasis
  dim:       243,   // mid grey — timestamps, file paths, detail
  subtle:    239,   // dark grey — barely-there borders, separators

  // --- Cool accents (the primary voice of the CLI) ---
  frost:     153,   // ice blue — primary accent, replaces neon cyan
  silver:    146,   // blue-grey — secondary accent, labels, section headers
  steel:     110,   // steel blue — info, links, navigation

  // --- Warm accent (used sparingly — hearth fire in a frost hall) ---
  hearth:    179,   // muted gold — brand name "Idavoll", special emphasis only

  // --- Status ---
  success:   108,   // sage green — cool, muted, northern forest
  warn:      179,   // muted gold — caution is warm (shared with hearth)
  error:     131,   // brick red — visible without screaming
  info:      110,   // steel blue — neutral information (shared with steel)

  // --- Structure ---
  stone:     243,   // cool grey — borders, dividers, carved stone
  slate:     238,   // darker grey — stripe backgrounds, depth

  // --- Special (rare) ---
  rune:      103,   // blue-grey — runic text, special labels
  aurora:    152,   // pale teal — highlights, rare accent moments
});
