/**
 * @fileoverview Norse Design System — Border Characters + Box Builder
 *
 * @description
 * Single canonical border character set and a `box()` builder that returns formatted line arrays.
 * Standard single-line borders (`┌─┐│└─┘`) — feels like etched stone, not industrial pipe
 * or cyberpunk neon. Replaces both heavy (`┏━┓`) and double (`╔═╗`) styles.
 *
 * Architecture & Lifecycle:
 * - Trigger: Imported by CLI surfaces that draw boxes or panels.
 * - Scope: Static Utility.
 *
 * Usage & Policy:
 * - Strict Rule: All box drawing MUST use these characters. No inline Unicode box chars.
 * - Access: `import { border, box } from '../ui/borders.js'` or via `../ui/index.js`.
 *
 * Dependencies:
 * - Upstream: None.
 * - Downstream: Startup panel, wizards, any CLI surface that draws bordered panels.
 *
 * @see {@link layout}
 */

import { stripAnsi } from './ansi.js';
import { c } from './paint.js';

export const border = Object.freeze({
  topLeft:     '\u250C',  // ┌
  topRight:    '\u2510',  // ┐
  bottomLeft:  '\u2514',  // └
  bottomRight: '\u2518',  // ┘
  horizontal:  '\u2500',  // ─
  vertical:    '\u2502',  // │
  leftMid:     '\u251C',  // ├
  rightMid:    '\u2524',  // ┤
  topMid:      '\u252C',  // ┬
  bottomMid:   '\u2534',  // ┴
  cross:       '\u253C',  // ┼
});

/**
 * Build a bordered box as an array of formatted lines.
 *
 * @param {object} options
 * @param {string} [options.title]       - Optional title for the top border.
 * @param {string[]} [options.lines]     - Body lines (may contain ANSI codes).
 * @param {Function} [options.borderColor] - Color function for border chars (default: c.stone).
 * @param {number} [options.minWidth]    - Minimum box width (default: 54).
 * @param {number} [options.maxWidth]    - Maximum box width (default: 96).
 * @returns {string[]} Array of formatted lines. Caller decides how to print.
 */
export function box(options) {
  const title = typeof options?.title === 'string' ? options.title : '';
  const lines = Array.isArray(options?.lines) ? options.lines : [];
  const borderColor = typeof options?.borderColor === 'function' ? options.borderColor : c.stone;
  const minWidth = typeof options?.minWidth === 'number' ? options.minWidth : 54;
  const maxWidth = typeof options?.maxWidth === 'number' ? options.maxWidth : 96;

  const contentWidths = lines.map((line) => stripAnsi(line).length);
  const titleWidth = stripAnsi(title).length;
  const maxContentWidth = Math.max(titleWidth + 4, ...contentWidths.map((width) => width + 4));
  const boxWidth = Math.max(minWidth, Math.min(maxWidth, maxContentWidth));
  const innerWidth = boxWidth - 2;

  const horizontalBar = border.horizontal.repeat(innerWidth);
  const result = [];

  // Top border (with optional title)
  if (title.length > 0) {
    const titlePadded = ` ${title} `;
    const titleVisibleLength = stripAnsi(titlePadded).length;
    const remainingWidth = Math.max(0, innerWidth - titleVisibleLength - 1);
    result.push(
      `${borderColor(border.topLeft)}${borderColor(border.horizontal)}${titlePadded}${borderColor(border.horizontal.repeat(remainingWidth))}${borderColor(border.topRight)}`
    );
  } else {
    result.push(`${borderColor(border.topLeft)}${borderColor(horizontalBar)}${borderColor(border.topRight)}`);
  }

  // Body lines
  for (const line of lines) {
    const visibleLength = stripAnsi(line).length;
    const padding = Math.max(0, innerWidth - visibleLength - 2);
    result.push(`${borderColor(border.vertical)} ${line}${' '.repeat(padding)} ${borderColor(border.vertical)}`);
  }

  // Bottom border
  result.push(`${borderColor(border.bottomLeft)}${borderColor(horizontalBar)}${borderColor(border.bottomRight)}`);

  return result;
}
