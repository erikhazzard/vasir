/**
 * @fileoverview Norse Design System — Interactive Select Primitives
 *
 * @description
 * Arrow-key-driven single-select and multi-select prompts for CLI wizards.
 * Uses raw-mode keypress handling with in-place ANSI re-rendering (no alt-screen).
 * Falls back to readline text prompts in non-TTY environments.
 *
 * Architecture & Lifecycle:
 * - Trigger: Called by interactive CLI wizards during selection collection.
 * - Scope: Transient per prompt invocation; raw mode is always restored via try/finally.
 *
 * Usage & Policy:
 * - Strict Rule: Never leave raw mode enabled after the function returns.
 * - Strict Rule: Always restore cursor visibility on exit.
 * - Access: `import { interactiveSelect, interactiveMultiSelect } from '../ui/interactive-select.js'`.
 *
 * Dependencies:
 * - Upstream: None.
 * - Downstream: Wizard files (deploy, tag, etc.).
 *
 * Critical Constraints:
 * - Safety: try/finally guarantees raw-mode + cursor restoration on any exit path.
 * - Performance: Re-renders only the visible list region via cursor-up ANSI sequences.
 *
 * @see {@link interactiveSelect}
 * @see {@link interactiveMultiSelect}
 */

import readline from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { stdin as stdinDefault, stdout as stdoutDefault } from 'node:process';
import { c } from './paint.js';
import { glyph } from './glyphs.js';
import { printLine } from './log.js';
import { promptNonEmpty } from './prompt.js';

// --- Local ANSI helpers (not exported; rendering-internal) ---
const cursorUp = (lineCount) => `\u001b[${lineCount}A`;
const clearLine = '\u001b[2K';
const hideCursor = '\u001b[?25l';
const showCursor = '\u001b[?25h';
const carriageReturn = '\r';

const DEFAULT_MAX_VISIBLE_ITEMS = 16;

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function renderSelectableItem(options) {
  const { item, isCursorRow, isSelected, isMultiSelect } = options;

  const cursorIndicator = isCursorRow
    ? c.frost(`${glyph.pointer} `)
    : '  ';

  let selectionIndicator;
  if (isMultiSelect) {
    selectionIndicator = isSelected
      ? c.ok(`${glyph.ok} `)
      : c.dim(`${glyph.pending} `);
  } else {
    selectionIndicator = isCursorRow
      ? c.frost(`${glyph.ok} `)
      : '  ';
  }

  const labelText = item.label || String(item.value);
  const hintText = item.hint ? c.dim(` ${item.hint}`) : '';

  // why: Special items (sdk, all) get distinct styling — frost label, no checkbox.
  if (item.isSpecial) {
    const specialLabel = c.frost(` ${labelText} `);
    const specialHint = item.hint ? c.dim(` ${item.hint}`) : '';
    return `${cursorIndicator}${selectionIndicator}${specialLabel}${specialHint}`;
  }

  return `${cursorIndicator}${selectionIndicator}${c.ink(labelText)}${hintText}`;
}

function renderFooterHints(options) {
  const parts = [];
  parts.push(c.dim('\u2191\u2193 navigate'));
  if (options.isMultiSelect) {
    parts.push(c.dim('\u2423 toggle'));
    parts.push(c.dim('a all'));
  }
  parts.push(c.dim('\u23CE confirm'));
  parts.push(c.dim('esc cancel'));
  return `  ${parts.join('  ')}`;
}

function computeScrollWindow(options) {
  const { cursorIndex, itemCount, maxVisibleItems } = options;
  const maxVisible = Math.min(maxVisibleItems, itemCount);
  let scrollOffset = options.scrollOffset || 0;

  // why: Keep cursor visible by adjusting scroll offset.
  if (cursorIndex < scrollOffset) {
    scrollOffset = cursorIndex;
  } else if (cursorIndex >= scrollOffset + maxVisible) {
    scrollOffset = cursorIndex - maxVisible + 1;
  }

  // why: Clamp scroll offset to valid range.
  scrollOffset = Math.max(0, Math.min(scrollOffset, itemCount - maxVisible));

  return { scrollOffset, visibleCount: maxVisible };
}

function buildSelectLines(options) {
  const {
    items,
    cursorIndex,
    selectedValues,
    scrollOffset,
    visibleCount,
    isMultiSelect,
    title,
    terminalWidth,
  } = options;

  const lines = [];

  // Title line
  if (title) {
    lines.push(`  ${title}`);
    lines.push('');
  }

  // Scroll-up indicator
  if (scrollOffset > 0) {
    lines.push(c.dim(`  ... ${scrollOffset} more above`));
  }

  // Visible items
  const endIndex = Math.min(scrollOffset + visibleCount, items.length);
  for (let itemIndex = scrollOffset; itemIndex < endIndex; itemIndex++) {
    const item = items[itemIndex];
    const isCursorRow = itemIndex === cursorIndex;
    const isSelected = selectedValues.has(item.value);

    // why: Separator line before the game list when special items are followed by regular items.
    if (itemIndex > 0 && !item.isSpecial && items[itemIndex - 1]?.isSpecial) {
      if (itemIndex === scrollOffset) {
        // don't show separator if it would be at scroll boundary
      } else {
        lines.push(c.dim(`  ${glyph.divider.repeat(3)} games ${glyph.divider.repeat(3)}`));
      }
    }

    lines.push(renderSelectableItem({
      item,
      isCursorRow,
      isSelected,
      isMultiSelect,
      terminalWidth,
      rowIndex: itemIndex,
    }));
  }

  // Scroll-down indicator
  const remainingBelow = items.length - endIndex;
  if (remainingBelow > 0) {
    lines.push(c.dim(`  ... ${remainingBelow} more below`));
  }

  // Footer hints
  lines.push('');
  lines.push(renderFooterHints({ isMultiSelect }));

  // Selection count (multi-select only)
  if (isMultiSelect && selectedValues.size > 0) {
    const count = selectedValues.size;
    lines.push(c.ok(`  ${glyph.ok} ${count} selected`));
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Raw-mode keypress lifecycle
// ---------------------------------------------------------------------------

function createRawKeypressSession(inputStream, outputStream) {
  const wasRawMode = inputStream.isRaw;

  readline.emitKeypressEvents(inputStream);
  if (inputStream.isTTY) {
    inputStream.setRawMode(true);
  }

  // why: Hide cursor during interactive selection for clean rendering.
  outputStream.write(hideCursor);

  let keypressHandler = null;
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;

    if (keypressHandler) {
      inputStream.removeListener('keypress', keypressHandler);
      keypressHandler = null;
    }

    if (inputStream.isTTY) {
      inputStream.setRawMode(wasRawMode);
    }

    outputStream.write(showCursor);
  }

  function onKeypress(handler) {
    keypressHandler = handler;
    inputStream.on('keypress', keypressHandler);
  }

  return { dispose, onKeypress };
}

// ---------------------------------------------------------------------------
// In-place rendering engine
// ---------------------------------------------------------------------------

function createInPlaceRenderer(outputStream) {
  let previousLineCount = 0;

  function render(lines) {
    // why: Move cursor up to overwrite previous render, then clear and rewrite each line.
    if (previousLineCount > 0) {
      outputStream.write(cursorUp(previousLineCount));
    }

    for (const line of lines) {
      outputStream.write(`${carriageReturn}${clearLine}${line}\n`);
    }

    // why: Clear any leftover lines from a previous longer render.
    const extraLines = previousLineCount - lines.length;
    for (let cleanupIndex = 0; cleanupIndex < extraLines; cleanupIndex++) {
      outputStream.write(`${carriageReturn}${clearLine}\n`);
    }
    // Move cursor back up to account for extra cleared lines
    if (extraLines > 0) {
      outputStream.write(cursorUp(extraLines));
    }

    previousLineCount = lines.length;
  }

  function getLineCount() {
    return previousLineCount;
  }

  function clear() {
    if (previousLineCount === 0) {
      return;
    }

    outputStream.write(cursorUp(previousLineCount));
    for (let lineIndex = 0; lineIndex < previousLineCount; lineIndex++) {
      outputStream.write(`${carriageReturn}${clearLine}`);
      if (lineIndex < previousLineCount - 1) {
        outputStream.write("\n");
      }
    }

    if (previousLineCount > 1) {
      outputStream.write(cursorUp(previousLineCount - 1));
    }

    outputStream.write(carriageReturn);
    previousLineCount = 0;
  }

  return { render, getLineCount, clear };
}

// ---------------------------------------------------------------------------
// Non-TTY fallback
// ---------------------------------------------------------------------------

async function fallbackSingleSelect(options) {
  const { items, title, promptLabel } = options;

  if (title) {
    printLine(`\n  ${title}`);
    printLine('');
  }

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = items[itemIndex];
    const indexLabel = c.frost(String(itemIndex + 1).padStart(2, ' '));
    const label = item.label || String(item.value);
    const hint = item.hint ? c.dim(` ${item.hint}`) : '';
    printLine(`  ${indexLabel}  ${c.ink(label)}${hint}`);
  }
  printLine('');

  const readlineInterface = createInterface({ input: stdinDefault, output: stdoutDefault });
  try {
    const answer = await promptNonEmpty(
      readlineInterface,
      promptLabel || 'Choice',
      {
        validate: (value) => {
          const parsed = Number.parseInt(value, 10);
          if (Number.isInteger(parsed) && parsed >= 1 && parsed <= items.length) {
            return null;
          }
          const found = items.find((item) => item.value === value || item.label === value);
          if (found) return null;
          return `Enter 1-${items.length} or a valid value.`;
        },
      }
    );

    const parsed = Number.parseInt(answer, 10);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= items.length) {
      return { value: items[parsed - 1].value, index: parsed - 1 };
    }
    const foundIndex = items.findIndex((item) => item.value === answer || item.label === answer);
    if (foundIndex >= 0) {
      return { value: items[foundIndex].value, index: foundIndex };
    }
    return null;
  } finally {
    readlineInterface.close();
  }
}

async function fallbackMultiSelect(options) {
  const { items, title, promptLabel } = options;

  if (title) {
    printLine(`\n  ${title}`);
    printLine('');
  }

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = items[itemIndex];
    const indexLabel = c.frost(String(itemIndex + 1).padStart(2, ' '));
    const label = item.label || String(item.value);
    const hint = item.hint ? c.dim(` ${item.hint}`) : '';
    printLine(`  ${indexLabel}  ${c.ink(label)}${hint}`);
  }
  printLine('');
  printLine(c.dim('  Enter numbers separated by commas (e.g. 1,3,5) or a single value.'));

  const readlineInterface = createInterface({ input: stdinDefault, output: stdoutDefault });
  try {
    const answer = await promptNonEmpty(
      readlineInterface,
      promptLabel || 'Choice',
      {
        validate: (value) => {
          const parts = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0);
          if (parts.length === 0) return 'Enter at least one selection.';
          for (const part of parts) {
            const parsed = Number.parseInt(part, 10);
            if (Number.isInteger(parsed) && parsed >= 1 && parsed <= items.length) continue;
            const found = items.find((item) => item.value === part || item.label === part);
            if (found) continue;
            return `Invalid selection: "${part}". Enter 1-${items.length} or a valid value.`;
          }
          return null;
        },
      }
    );

    const parts = answer.split(',').map((part) => part.trim()).filter((part) => part.length > 0);
    const values = [];
    const indices = [];

    for (const part of parts) {
      const parsed = Number.parseInt(part, 10);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= items.length) {
        const idx = parsed - 1;
        if (!values.includes(items[idx].value)) {
          values.push(items[idx].value);
          indices.push(idx);
        }
        continue;
      }
      const foundIndex = items.findIndex((item) => item.value === part || item.label === part);
      if (foundIndex >= 0 && !values.includes(items[foundIndex].value)) {
        values.push(items[foundIndex].value);
        indices.push(foundIndex);
      }
    }

    return values.length > 0 ? { values, indices } : null;
  } finally {
    readlineInterface.close();
  }
}

// ---------------------------------------------------------------------------
// interactiveSelect — single-select with arrow keys
// ---------------------------------------------------------------------------

/**
 * Single-select prompt with arrow-key navigation.
 *
 * @param {object} options
 * @param {Array<{value: string, label: string, hint?: string, isSpecial?: boolean}>} options.items
 * @param {string} [options.title] - Title shown above the list.
 * @param {string} [options.promptLabel] - Label for non-TTY fallback prompt.
 * @param {number} [options.initialCursorIndex] - Starting cursor position (default: 0).
 * @param {number} [options.maxVisibleItems] - Scroll window size (default: 16).
 * @returns {Promise<{value: string, index: number} | null>} null if canceled.
 */
export async function interactiveSelect(options) {
  const {
    items,
    title,
    promptLabel,
    initialCursorIndex = 0,
    maxVisibleItems = DEFAULT_MAX_VISIBLE_ITEMS,
    clearOnExit = false,
  } = options;

  if (!items || items.length === 0) {
    return null;
  }

  const inputStream = stdinDefault;
  const outputStream = stdoutDefault;

  // why: Non-TTY fallback preserves CI/piped-input compatibility.
  if (!inputStream.isTTY || !outputStream.isTTY) {
    return fallbackSingleSelect(options);
  }

  const terminalWidth = outputStream.columns || 80;
  const session = createRawKeypressSession(inputStream, outputStream);
  const renderer = createInPlaceRenderer(outputStream);

  let cursorIndex = Math.max(0, Math.min(initialCursorIndex, items.length - 1));
  let scrollOffset = 0;
  const selectedValues = new Set();

  function redraw() {
    const scroll = computeScrollWindow({
      cursorIndex,
      itemCount: items.length,
      maxVisibleItems,
      scrollOffset,
    });
    scrollOffset = scroll.scrollOffset;

    const lines = buildSelectLines({
      items,
      cursorIndex,
      selectedValues,
      scrollOffset,
      visibleCount: scroll.visibleCount,
      isMultiSelect: false,
      title,
      terminalWidth,
    });
    renderer.render(lines);
  }

  // Initial render
  redraw();

  return new Promise((resolve) => {
    function cleanup(result) {
      if (clearOnExit) {
        renderer.clear();
      }
      session.dispose();
      resolve(result);
    }

    session.onKeypress((_character, key) => {
      if (!key) return;

      // Cancel
      if (key.name === 'escape' || (key.name === 'c' && key.ctrl)) {
        redraw(); // final render before exit
        cleanup(null);
        return;
      }

      // Confirm
      if (key.name === 'return' || key.name === 'space') {
        redraw();
        cleanup({ value: items[cursorIndex].value, index: cursorIndex });
        return;
      }

      // Navigate up
      if (key.name === 'up' || key.name === 'k') {
        cursorIndex = cursorIndex > 0 ? cursorIndex - 1 : items.length - 1;
        redraw();
        return;
      }

      // Navigate down
      if (key.name === 'down' || key.name === 'j') {
        cursorIndex = cursorIndex < items.length - 1 ? cursorIndex + 1 : 0;
        redraw();
        return;
      }

      // Home
      if (key.name === 'home') {
        cursorIndex = 0;
        redraw();
        return;
      }

      // End
      if (key.name === 'end') {
        cursorIndex = items.length - 1;
        redraw();
        return;
      }
    });
  });
}

// ---------------------------------------------------------------------------
// interactiveMultiSelect — multi-select with arrow keys + space toggle
// ---------------------------------------------------------------------------

/**
 * Multi-select prompt with arrow-key navigation and space-to-toggle.
 *
 * @param {object} options
 * @param {Array<{value: string, label: string, hint?: string, isSpecial?: boolean}>} options.items
 * @param {string} [options.title] - Title shown above the list.
 * @param {string} [options.promptLabel] - Label for non-TTY fallback prompt.
 * @param {Set<string>} [options.initialSelection] - Pre-selected values.
 * @param {number} [options.initialCursorIndex] - Starting cursor position (default: 0).
 * @param {number} [options.maxVisibleItems] - Scroll window size (default: 16).
 * @param {boolean} [options.allowEmpty] - Allow confirming with nothing selected (default: false).
 * @returns {Promise<{values: string[], indices: number[]} | null>} null if canceled.
 */
export async function interactiveMultiSelect(options) {
  const {
    items,
    title,
    promptLabel,
    initialSelection,
    initialCursorIndex = 0,
    maxVisibleItems = DEFAULT_MAX_VISIBLE_ITEMS,
    allowEmpty = false,
  } = options;

  if (!items || items.length === 0) {
    return null;
  }

  const inputStream = stdinDefault;
  const outputStream = stdoutDefault;

  // why: Non-TTY fallback preserves CI/piped-input compatibility.
  if (!inputStream.isTTY || !outputStream.isTTY) {
    return fallbackMultiSelect(options);
  }

  const terminalWidth = outputStream.columns || 80;
  const session = createRawKeypressSession(inputStream, outputStream);
  const renderer = createInPlaceRenderer(outputStream);

  let cursorIndex = Math.max(0, Math.min(initialCursorIndex, items.length - 1));
  let scrollOffset = 0;
  const selectedValues = new Set(initialSelection || []);

  // why: Special items (sdk, all) are mutually exclusive with individual games.
  // Toggling a special item clears all non-special selections and vice versa.
  function toggleItem(itemIndex) {
    const item = items[itemIndex];
    const isCurrentlySelected = selectedValues.has(item.value);

    if (item.isSpecial) {
      // Toggling a special item: clear everything, then toggle this one.
      selectedValues.clear();
      if (!isCurrentlySelected) {
        selectedValues.add(item.value);
      }
    } else {
      // Toggling a regular item: clear any special selections first.
      for (const selectedValue of [...selectedValues]) {
        const selectedItem = items.find((candidate) => candidate.value === selectedValue);
        if (selectedItem?.isSpecial) {
          selectedValues.delete(selectedValue);
        }
      }

      if (isCurrentlySelected) {
        selectedValues.delete(item.value);
      } else {
        selectedValues.add(item.value);
      }
    }
  }

  function toggleAllRegularItems() {
    const regularItems = items.filter((item) => !item.isSpecial);
    const allRegularSelected = regularItems.every((item) => selectedValues.has(item.value));

    // Clear special selections first.
    for (const selectedValue of [...selectedValues]) {
      const selectedItem = items.find((candidate) => candidate.value === selectedValue);
      if (selectedItem?.isSpecial) {
        selectedValues.delete(selectedValue);
      }
    }

    if (allRegularSelected) {
      // Deselect all regular items.
      for (const item of regularItems) {
        selectedValues.delete(item.value);
      }
    } else {
      // Select all regular items.
      for (const item of regularItems) {
        selectedValues.add(item.value);
      }
    }
  }

  function redraw() {
    const scroll = computeScrollWindow({
      cursorIndex,
      itemCount: items.length,
      maxVisibleItems,
      scrollOffset,
    });
    scrollOffset = scroll.scrollOffset;

    const lines = buildSelectLines({
      items,
      cursorIndex,
      selectedValues,
      scrollOffset,
      visibleCount: scroll.visibleCount,
      isMultiSelect: true,
      title,
      terminalWidth,
    });
    renderer.render(lines);
  }

  // Initial render
  redraw();

  return new Promise((resolve) => {
    function cleanup(result) {
      session.dispose();
      resolve(result);
    }

    session.onKeypress((_character, key) => {
      if (!key) return;

      // Cancel
      if (key.name === 'escape' || (key.name === 'c' && key.ctrl)) {
        redraw();
        cleanup(null);
        return;
      }

      // Confirm
      if (key.name === 'return') {
        if (!allowEmpty && selectedValues.size === 0) {
          // Don't confirm with nothing selected — visual hint stays.
          return;
        }

        const values = [];
        const indices = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          if (selectedValues.has(items[itemIndex].value)) {
            values.push(items[itemIndex].value);
            indices.push(itemIndex);
          }
        }

        redraw();
        cleanup({ values, indices });
        return;
      }

      // Toggle current item
      if (key.name === 'space') {
        toggleItem(cursorIndex);
        redraw();
        return;
      }

      // Toggle all regular items
      if (_character === 'a' && !key.ctrl && !key.meta) {
        toggleAllRegularItems();
        redraw();
        return;
      }

      // Navigate up
      if (key.name === 'up' || key.name === 'k') {
        cursorIndex = cursorIndex > 0 ? cursorIndex - 1 : items.length - 1;
        redraw();
        return;
      }

      // Navigate down
      if (key.name === 'down' || key.name === 'j') {
        cursorIndex = cursorIndex < items.length - 1 ? cursorIndex + 1 : 0;
        redraw();
        return;
      }

      // Home
      if (key.name === 'home') {
        cursorIndex = 0;
        redraw();
        return;
      }

      // End
      if (key.name === 'end') {
        cursorIndex = items.length - 1;
        redraw();
        return;
      }
    });
  });
}
