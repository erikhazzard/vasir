import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DISALLOWED_MULTILINE_LITERAL_PATTERN = /\]\.join\((["'])\\n\1\)/;
const IGNORED_DIRECTORY_NAMES = new Set([".git", ".agents", "node_modules"]);

function collectJavaScriptFiles(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const collectedFilePaths = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }

      collectedFilePaths.push(
        ...collectJavaScriptFiles(path.join(directoryPath, entry.name))
      );
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      collectedFilePaths.push(path.join(directoryPath, entry.name));
    }
  }

  return collectedFilePaths;
}

test("repo does not build multiline literals with array join", () => {
  const violatingFiles = collectJavaScriptFiles(REPO_ROOT)
    .filter((filePath) =>
      DISALLOWED_MULTILINE_LITERAL_PATTERN.test(fs.readFileSync(filePath, "utf8"))
    )
    .map((filePath) => path.relative(REPO_ROOT, filePath));

  assert.deepEqual(violatingFiles, []);
});
