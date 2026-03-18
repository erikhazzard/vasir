import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRegistry, formatRegistry } from "../registry/build.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("registry.json matches generated output", () => {
  const expectedRegistryContents = formatRegistry(buildRegistry());
  const actualRegistryContents = fs.readFileSync(path.join(REPO_ROOT, "registry.json"), "utf8");
  assert.equal(actualRegistryContents, expectedRegistryContents);
});
