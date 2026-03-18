import readline from "node:readline/promises";
import process from "node:process";

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
  const promptInterface = readline.createInterface({
    input: inputStream,
    output: outputStream
  });

  try {
    outputStream.write(
      `${providerLabel} is part of the default eval set (${defaultModelId}), but ${apiKeyName} is not set.\n`
    );
    outputStream.write("[p]aste key, [s]kip provider, [c]ancel: ");
    const action = (await promptInterface.question("")).trim().toLowerCase();

    if (action === "c" || action === "cancel") {
      return { cancelled: true };
    }

    if (action === "s" || action === "skip") {
      return { skipped: true };
    }

    if (action === "p" || action === "paste") {
      outputStream.write(`Paste ${apiKeyName}: `);
      const apiKeyValue = (await promptInterface.question("")).trim();
      if (apiKeyValue.length > 0) {
        return { apiKeyValue };
      }
    }

    return { skipped: true };
  } finally {
    promptInterface.close();
  }
}
