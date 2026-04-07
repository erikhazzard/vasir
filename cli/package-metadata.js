import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let cachedPackageMetadata = null;
let cachedPackageRootDirectory = null;

export function readPackageMetadata() {
  if (cachedPackageMetadata) {
    return cachedPackageMetadata;
  }

  cachedPackageMetadata = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
  );
  return cachedPackageMetadata;
}

export function getPackageRootDirectory() {
  if (cachedPackageRootDirectory) {
    return cachedPackageRootDirectory;
  }

  cachedPackageRootDirectory = path.dirname(
    fileURLToPath(new URL("../package.json", import.meta.url))
  );
  return cachedPackageRootDirectory;
}
