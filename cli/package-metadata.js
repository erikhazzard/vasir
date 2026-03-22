import fs from "node:fs";

let cachedPackageMetadata = null;

export function readPackageMetadata() {
  if (cachedPackageMetadata) {
    return cachedPackageMetadata;
  }

  cachedPackageMetadata = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
  );
  return cachedPackageMetadata;
}
