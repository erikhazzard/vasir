import readline from "node:readline/promises";
import process from "node:process";

import { createCommandUi } from "../scripts/ui/command-output.js";

export function canPromptInteractively({
  inputStream = process.stdin,
  outputStream = process.stdout
} = {}) {
  return inputStream?.isTTY === true && outputStream?.isTTY === true;
}

export async function promptForMissingProviderCredential({
  providerLabel,
  apiKeyName,
  defaultModelId,
  inputStream = process.stdin,
  outputStream = process.stdout
}) {
  const ui = createCommandUi({ stream: outputStream });
  const promptInterface = readline.createInterface({
    input: inputStream,
    output: outputStream
  });

  try {
    outputStream.write(
      ui.renderPanel({
        title: `Eval ${providerLabel}`,
        lines: [
          ui.formatStatusLine({
            kind: "warn",
            text: `${providerLabel} is part of the default eval set`
          }),
          ui.formatField("model", defaultModelId),
          ui.formatField("missing", apiKeyName)
        ]
      })
    );
    const action = (await promptInterface.question(
      ui.formatPrompt("action", "p=key s=skip c=cancel")
    )).trim().toLowerCase();

    if (action === "c" || action === "cancel") {
      return { cancelled: true };
    }

    if (action === "s" || action === "skip") {
      return { skipped: true };
    }

    if (action === "p" || action === "paste") {
      const apiKeyValue = (await promptInterface.question(
        ui.formatPrompt(`paste ${apiKeyName}`)
      )).trim();
      if (apiKeyValue.length > 0) {
        return { apiKeyValue };
      }
    }

    return { skipped: true };
  } finally {
    promptInterface.close();
  }
}
