import { ansi, stripAnsi } from "./ansi.js";
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
  const meterFilledGlyph = "█";
  const meterEmptyGlyph = "░";

  function formatStatusLine({ kind = "info", text, detail = "" }) {
    const meta = STATUS_META[kind] ?? STATUS_META.info;
    const symbolText = paintWith(stream, meta.symbol, ...meta.symbolCodes);
    const textValue = paintWith(stream, text, ...meta.textCodes);
    return detail ? `${symbolText} ${textValue} ${colors.dim(detail)}` : `${symbolText} ${textValue}`;
  }

  function formatBullet(text) {
    return `${colors.dim(glyph.bullet)} ${text}`;
  }

  function formatField(label, value, { labelWidth = 0 } = {}) {
    const labelText = `${label}:`;
    const labelPadding = labelWidth > 0
      ? " ".repeat(Math.max(0, labelWidth - stripAnsi(labelText).length))
      : "";
    return `${colors.dim(labelText)}${labelPadding} ${value}`;
  }

  function formatPath(pathText) {
    return colors.muted(pathText);
  }

  function formatPercent(value) {
    return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
  }

  function formatCount(value) {
    return Number(value ?? 0).toLocaleString("en-US");
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

  function formatMeter({ value, total = 1, width = 12 }) {
    const safeTotal = total > 0 ? total : 1;
    const normalizedValue = Math.max(0, Math.min(1, Number(value ?? 0) / safeTotal));
    const filledWidth = Math.round(normalizedValue * width);
    const filledSegment = meterFilledGlyph.repeat(filledWidth);
    const emptySegment = meterEmptyGlyph.repeat(Math.max(0, width - filledWidth));
    return `${colors.frost(filledSegment)}${colors.dim(emptySegment)}`;
  }

  function formatProgress({ current, total, width = 12 }) {
    return `${formatMeter({ value: current, total, width })} ${current}/${total}`;
  }

  function formatOutcome(outcome) {
    if (outcome === "better") {
      return colors.ok("BETTER");
    }
    if (outcome === "worse") {
      return colors.error("WORSE");
    }
    if (outcome === "complete") {
      return colors.ok("COMPLETE");
    }
    if (outcome === "incomplete") {
      return colors.warn("INCOMPLETE");
    }
    if (outcome === "mixed") {
      return colors.warn("MIXED");
    }
    if (outcome === "inconclusive") {
      return colors.warn("INCONCLUSIVE");
    }
    if (outcome === "no_data") {
      return colors.warn("NO DATA");
    }
    if (outcome === "no_signal") {
      return colors.dim("NO SIGNAL");
    }
    if (outcome === "no_prior") {
      return colors.dim("NO PRIOR VERSION");
    }
    if (outcome === "not_comparable") {
      return colors.warn("NOT COMPARABLE");
    }
    return colors.dim("NO CHANGE");
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
    return normalizedLines.length > 0
      ? `${renderedTitle}\n${normalizedLines.join("\n")}\n`
      : `${renderedTitle}\n`;
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
    formatPercent,
    formatCount,
    formatLift,
    formatMeter,
    formatProgress,
    formatOutcome,
    formatPrompt,
    renderPanel,
    renderSection
  };
}
