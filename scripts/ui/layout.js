/**
 * @fileoverview Norse Design System — Layout Primitives
 *
 * @description
 * ANSI-aware text measurement, padding, truncation, word wrap, and column merge utilities.
 * Extracted from the duplicated implementations in startupUi.js and create-wizard-fullscreen-ui.js.
 *
 * Architecture & Lifecycle:
 * - Trigger: Imported by CLI surfaces that need ANSI-safe text layout.
 * - Scope: Static Utility.
 *
 * Usage & Policy:
 * - Strict Rule: All ANSI-aware padding/truncation MUST use these functions.
 * - Access: `import { visibleLength, padRight, ... } from '../ui/layout.js'` or via `../ui/index.js`.
 *
 * Dependencies:
 * - Upstream: None.
 * - Downstream: Startup panel, fullscreen UI, wizards, box builder.
 *
 * @see {@link ansi}
 */

import { stripAnsi } from './ansi.js';

export function visibleLength(text) {
  return stripAnsi(text).length;
}

export function padRight(text, width) {
  const visible = visibleLength(text);
  if (visible >= width) {
    return text;
  }
  return `${text}${' '.repeat(width - visible)}`;
}

export function padCenter(text, width) {
  const visible = visibleLength(text);
  if (visible >= width) {
    return text;
  }
  const leftPad = Math.floor((width - visible) / 2);
  const rightPad = width - visible - leftPad;
  return `${' '.repeat(leftPad)}${text}${' '.repeat(rightPad)}`;
}

/**
 * Truncate an ANSI-coded string to a maximum visible width.
 * Preserves ANSI escape codes by counting only visible characters.
 */
export function truncateToWidth(text, maxWidth) {
  const raw = String(text || '');
  if (maxWidth <= 0) {
    return '';
  }

  let visibleCount = 0;
  let output = '';
  for (let index = 0; index < raw.length; index++) {
    const character = raw[index];

    // Skip ANSI escape sequences (they have zero visible width)
    if (character === '\u001b') {
      const match = raw.slice(index).match(/^\u001b\[[0-9;]*m/);
      if (match) {
        output += match[0];
        index += match[0].length - 1;
        continue;
      }
    }

    output += character;
    visibleCount += 1;
    if (visibleCount >= maxWidth) {
      break;
    }
  }

  return output;
}

export function wrapPlainTextToWidth(text, maxWidth) {
  if (maxWidth < 1) {
    return [String(text)];
  }
  const raw = String(text || '');
  if (raw.length <= maxWidth) {
    return [raw];
  }
  const words = raw.split(/(\s+)/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + word.length <= maxWidth) {
      current += word;
    } else {
      lines.push(current);
      current = word.trimStart();
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [''];
}

export function mergeTwoColumns(options) {
  const leftLines = Array.isArray(options?.leftLines) ? options.leftLines : [];
  const rightLines = Array.isArray(options?.rightLines) ? options.rightLines : [];
  const gapText = typeof options?.gapText === 'string' ? options.gapText : '  ';

  const totalRows = Math.max(leftLines.length, rightLines.length);
  const merged = [];
  for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
    const left = rowIndex < leftLines.length ? String(leftLines[rowIndex] || '') : '';
    const right = rowIndex < rightLines.length ? String(rightLines[rowIndex] || '') : '';
    merged.push(`${left}${gapText}${right}`);
  }
  return merged;
}
