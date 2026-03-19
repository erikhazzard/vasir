/**
 * @fileoverview Norse Design System — Barrel Export
 *
 * @description
 * Re-exports all design system modules for convenient single-import access.
 * `import { c, glyph, box, logInfo, printLine } from '../ui/index.js'`
 *
 * @see {@link theme}
 * @see {@link paint}
 * @see {@link glyphs}
 * @see {@link borders}
 * @see {@link layout}
 * @see {@link log}
 * @see {@link prompt}
 */

export { theme } from './theme.js';
export { ANSI_PATTERN, ansi, supportsColor, stripAnsi } from './ansi.js';
export { paint, paintOn, c } from './paint.js';
export { glyph } from './glyphs.js';
export { border, box } from './borders.js';
export {
  visibleLength,
  padRight,
  padCenter,
  truncateToWidth,
  wrapPlainTextToWidth,
  mergeTwoColumns,
} from './layout.js';
export {
  setVerbose,
  isVerbose,
  setLogSuppressed,
  isLogSuppressed,
  logDebug,
  logInfo,
  logWarn,
  logError,
  printLine,
} from './log.js';
export {
  formatPromptLabel,
  formatPromptHint,
  promptNonEmpty,
  promptYesNo,
} from './prompt.js';
export {
  interactiveSelect,
  interactiveMultiSelect,
} from './interactive-select.js';
export { createCommandUi } from "./command-output.js";
