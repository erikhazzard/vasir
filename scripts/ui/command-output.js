import { ansi } from "./ansi.js";
import { box } from "./borders.js";
import { glyph } from "./glyphs.js";
import { paintOn } from "./paint.js";
import { theme } from "./theme.js";

const STATUS_META = Object.freeze({
  ok: {
    symbol: glyph.ok,
    symbolCodes: [ansi.bold, ansi.fg256(theme.success)],
    textCodes: [ansi.bold, ansi.fg256(theme.success)]
  },
  info: {
    symbol: glyph.bullet,
    symbolCodes: [ansi.fg256(theme.info)],
    textCodes: [ansi.fg256(theme.ink)]
  },
  warn: {
    symbol: glyph.warn,
    symbolCodes: [ansi.fg256(theme.warn)],
    textCodes: [ansi.fg256(theme.warn)]
  },
  error: {
    symbol: glyph.error,
    symbolCodes: [ansi.bold, ansi.fg256(theme.error)],
    textCodes: [ansi.bold, ansi.fg256(theme.error)]
  }
});

function paintWith(stream, text, ...codes) {
  return paintOn(stream, text, ...codes);
}

function createPalette(stream) {
  return Object.freeze({
    ink: (text) => paintWith(stream, text, ansi.fg256(theme.ink)),
    muted: (text) => paintWith(stream, text, ansi.fg256(theme.muted)),
    dim: (text) => paintWith(stream, text, ansi.fg256(theme.dim)),
    subtle: (text) => paintWith(stream, text, ansi.fg256(theme.subtle)),
    frost: (text) => paintWith(stream, text, ansi.bold, ansi.fg256(theme.frost)),
    silver: (text) => paintWith(stream, text, ansi.fg256(theme.silver)),
    steel: (text) => paintWith(stream, text, ansi.fg256(theme.steel)),
    ok: (text) => paintWith(stream, text, ansi.bold, ansi.fg256(theme.success)),
    warn: (text) => paintWith(stream, text, ansi.fg256(theme.warn)),
    error: (text) => paintWith(stream, text, ansi.bold, ansi.fg256(theme.error)),
    stone: (text) => paintWith(stream, text, ansi.fg256(theme.stone)),
    bold: (text) => paintWith(stream, text, ansi.bold),
    header: (text) => paintWith(stream, text, ansi.bold, ansi.fg256(theme.frost))
  });
}

export function createCommandUi({ stream }) {
  const colors = createPalette(stream);
  const frameOutput = Boolean(stream?.isTTY);

  function formatStatusLine({ kind = "info", text, detail = "" }) {
    const meta = STATUS_META[kind] ?? STATUS_META.info;
    const symbolText = paintWith(stream, meta.symbol, ...meta.symbolCodes);
    const textValue = paintWith(stream, text, ...meta.textCodes);
    return detail ? `${symbolText} ${textValue} ${colors.dim(detail)}` : `${symbolText} ${textValue}`;
  }

  function formatBullet(text) {
    return `${colors.dim(glyph.bullet)} ${text}`;
  }

  function formatField(label, value) {
    return `${colors.dim(`${label}:`)} ${value}`;
  }

  function formatPath(pathText) {
    return colors.muted(pathText);
  }

  function formatLift(value, suffix = " pts") {
    const percentagePoints = `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}${suffix}`;
    if (value > 0) {
      return colors.ok(percentagePoints);
    }
    if (value < 0) {
      return colors.error(percentagePoints);
    }
    return colors.dim(percentagePoints);
  }

  function renderPanel({ title, lines, minWidth = 54, maxWidth = 96 }) {
    const normalizedLines = Array.isArray(lines) ? lines : [];
    if (!frameOutput) {
      const plainLines = title ? [title, "", ...normalizedLines] : normalizedLines;
      return `${plainLines.join("\n")}\n`;
    }

    return `${box({
      title: colors.header(title),
      lines: normalizedLines,
      borderColor: colors.stone,
      minWidth,
      maxWidth
    }).join("\n")}\n`;
  }

  function renderSection({ title, lines }) {
    const normalizedLines = Array.isArray(lines) ? lines : [];
    const renderedTitle = colors.header(title);
    return `${[renderedTitle, ...normalizedLines].join("\n")}\n`;
  }

  function formatPrompt(label, hint = "") {
    const promptLabel = `  ${paintWith(stream, glyph.pointer, ansi.bold, ansi.fg256(theme.frost))} ${colors.ink(label)}:`;
    if (!hint) {
      return `${promptLabel} `;
    }

    return `${promptLabel} ${colors.dim(`(${hint})`)} `;
  }

  return {
    colors,
    formatStatusLine,
    formatBullet,
    formatField,
    formatPath,
    formatLift,
    formatPrompt,
    renderPanel,
    renderSection
  };
}
