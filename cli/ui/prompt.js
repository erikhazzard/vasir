/**
 * @fileoverview Norse Design System — Unified Prompt Helpers
 *
 * @description
 * Canonical prompt formatting and interactive question helpers for CLI wizards.
 * Replaces both the spaced-letter style (`g a m e  ▸  `) and the cyan-question style
 * (`? Label: `) with one clean prompt: `  ▸ Label: ` (frost pointer, clean text).
 *
 * Architecture & Lifecycle:
 * - Trigger: Called by interactive CLI wizards during user input collection.
 * - Scope: Static Utility.
 *
 * Usage & Policy:
 * - Strict Rule: All interactive prompts in wizards MUST use these helpers.
 * - Access: `import { promptNonEmpty, promptYesNo } from '../ui/prompt.js'`.
 *
 * Dependencies:
 * - Upstream: None.
 * - Downstream: Wizard files (deploy, create, rename, disable, enable, tag).
 *
 * @see {@link paint}
 * @see {@link glyphs}
 */

import { c } from './paint.js';
import { glyph } from './glyphs.js';
import { printLine } from './log.js';

export function formatPromptLabel(label) {
  return `  ${c.frost(glyph.pointer)} ${c.ink(label)}: `;
}

export function formatPromptHint(hint) {
  return c.dim(`(${hint}) `);
}

/**
 * Prompt for a non-empty string value with optional validation.
 *
 * @param {import('node:readline/promises').Interface} readlineInterface
 * @param {string} label - The prompt label text.
 * @param {object} [options]
 * @param {string} [options.hint] - Hint text shown in parentheses.
 * @param {string} [options.defaultValue] - Value returned on empty input.
 * @param {Function} [options.validate] - Returns error string or null/undefined if valid.
 * @returns {Promise<string>}
 */
export async function promptNonEmpty(readlineInterface, label, options) {
  const promptText = formatPromptLabel(label) +
    (options?.hint ? formatPromptHint(options.hint) : '');

  for (;;) {
    const answer = await readlineInterface.question(promptText);
    const trimmed = answer.trim();

    if (trimmed.length === 0 && typeof options?.defaultValue === 'string') {
      return options.defaultValue;
    }

    if (trimmed.length === 0) {
      printLine(c.warn(`  ${glyph.warn} Please enter a value.`));
      continue;
    }

    if (typeof options?.validate === 'function') {
      const validationError = options.validate(trimmed);
      if (validationError) {
        printLine(c.warn(`  ${glyph.warn} ${validationError}`));
        continue;
      }
    }

    return trimmed;
  }
}

/**
 * Prompt for a yes/no confirmation.
 *
 * @param {import('node:readline/promises').Interface} readlineInterface
 * @param {string} label - The prompt label text.
 * @param {boolean} [defaultYes=true] - Whether Enter defaults to yes.
 * @returns {Promise<boolean>}
 */
export async function promptYesNo(readlineInterface, label, defaultYes = true) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const promptText = formatPromptLabel(label) + formatPromptHint(hint);

  for (;;) {
    const answer = await readlineInterface.question(promptText);
    const trimmed = answer.trim().toLowerCase();

    if (trimmed.length === 0) {
      return defaultYes;
    }
    if (['y', 'yes'].includes(trimmed)) {
      return true;
    }
    if (['n', 'no'].includes(trimmed)) {
      return false;
    }

    printLine(c.warn(`  ${glyph.warn} Type y or n.`));
  }
}
