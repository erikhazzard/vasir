import process from "node:process";

import { UNEXPECTED_ERROR_TROUBLESHOOTING_DOCS_REF } from "./docs-ref.js";
import { createCommandUi } from "./ui/command-output.js";

export class VasirCliError extends Error {
  constructor({
    code,
    message,
    suggestion,
    context = {},
    docsRef,
    exitCode = 1,
    cause
  }) {
    super(message, cause ? { cause } : undefined);
    this.name = "VasirCliError";
    this.code = code;
    this.suggestion = suggestion;
    this.context = context;
    this.docsRef = docsRef;
    this.exitCode = exitCode;
  }
}

export function isVasirCliError(error) {
  return error instanceof VasirCliError;
}

export function wrapUnknownCliError(error) {
  if (isVasirCliError(error)) {
    return error;
  }

  return new VasirCliError({
    code: "UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : "Unexpected CLI failure",
    suggestion: "Inspect the reported command error, fix the local environment or repository state, then retry the Vasir command.",
    docsRef: UNEXPECTED_ERROR_TROUBLESHOOTING_DOCS_REF,
    cause: error instanceof Error ? error : undefined
  });
}

export function formatCliErrorForText(error, { outputStream = process.stderr } = {}) {
  const ui = createCommandUi({ stream: outputStream });
  const renderedLines = [
    ui.formatStatusLine({
      kind: "error",
      text: error.message
    })
  ];

  if (error.code) {
    renderedLines.push(ui.formatField("code", ui.colors.bold(error.code)));
  }

  if (error.suggestion) {
    renderedLines.push(ui.formatField("suggestion", error.suggestion));
  }

  if (error.docsRef) {
    renderedLines.push(ui.formatField("docs", ui.formatPath(error.docsRef)));
  }

  return ui.renderPanel({
    title: "Error",
    lines: renderedLines
  });
}

export function formatCliErrorForJson({ commandName, error }) {
  const errorEnvelope = {
    command: commandName,
    status: "error",
    code: error.code,
    message: error.message,
    suggestion: error.suggestion,
    context: error.context
  };

  if (error.docsRef) {
    errorEnvelope.docsRef = error.docsRef;
  }

  return errorEnvelope;
}
