import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SELECTION_PATHS = Object.freeze([
  "benchmarks/public-results.json",
  "benchmarks/storytelling-core-idea/publication.json",
  "benchmarks/storytelling-plot-twists/publication.json",
  "benchmarks/dungeon-master-adventure-outline/publication.json",
  "benchmarks/writing-compact-v1/publication.json",
  "benchmarks/storytelling-magic-discovery/publication.json",
  "benchmarks/2d-jumping-demo/publication.json"
]);
const LEGACY_SELECTION_PATHS = Object.freeze(SELECTION_PATHS.filter(file => ![
  "benchmarks/writing-compact-v1/publication.json",
  "benchmarks/storytelling-magic-discovery/publication.json"
].includes(file)));
const DM_SELECTION_PATH = "benchmarks/dungeon-master-adventure-outline/publication.json";
const DM_SNAPSHOT_PREFIX = ".agents/vasir-evals/dungeon-master-adventure-outline/publication-snapshots/";
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const snapshotIdentity = ({ snapshotId: _snapshotId, ...manifest }) => sha256(JSON.stringify(manifest));

export function createSelectionSnapshot({ proofDirectory, publicationSourceRootDirectory, repoRootDirectory, preview = false }) {
  const output = path.resolve(proofDirectory);
  const sourceRoot = path.resolve(publicationSourceRootDirectory);
  const presentationRoot = path.resolve(repoRootDirectory);
  const snapshotPath = path.join(output, "selection-snapshot.json");
  if (fs.existsSync(snapshotPath) || fs.existsSync(path.join(output, "selections"))) throw new Error("Use a new proof directory; selection snapshots are immutable.");
  fs.mkdirSync(output, { recursive: true });
  const files = SELECTION_PATHS.map(relative => {
    const source = path.join(preview && relative === DM_SELECTION_PATH ? presentationRoot : sourceRoot, relative);
    let contents;
    try { contents = fs.readFileSync(source); } catch (error) {
      if (error.code !== "ENOENT") throw error;
      // Preserve an optional selection's absence even if another task creates it later.
      return { path: relative, present: false, bytes: null, sha256: null };
    }
    const target = path.join(output, "selections", relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents, { flag: "wx", mode: 0o444 });
    return { path: relative, present: true, bytes: contents.length, sha256: sha256(contents) };
  });
  const manifest = { kind: "vasirbenchmark-selection-snapshot", schemaVersion: 2, createdAt: new Date().toISOString(),
    publicationSourceRootDirectory: sourceRoot, preview, previewSourceRootDirectory: preview ? presentationRoot : null, files };
  manifest.snapshotId = snapshotIdentity(manifest);
  fs.writeFileSync(snapshotPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o444 });
  return loadSelectionSnapshot({ snapshotPath, publicationSourceRootDirectory: sourceRoot, repoRootDirectory: presentationRoot, allowPreview: preview });
}

export function loadSelectionSnapshot({ snapshotPath, publicationSourceRootDirectory, repoRootDirectory, allowPreview = false, expectedSha256, expectedSnapshotId }) {
  const manifestPath = path.resolve(snapshotPath);
  if (!fs.lstatSync(manifestPath).isFile()) throw new Error("Selection snapshot manifest must be a regular file.");
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifestSha256 = sha256(manifestBytes);
  if (expectedSha256 && manifestSha256 !== expectedSha256) throw new Error("The selection snapshot manifest changed after review.");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const registeredPaths = manifest.schemaVersion === 2 ? SELECTION_PATHS : LEGACY_SELECTION_PATHS;
  if (manifest.kind !== "vasirbenchmark-selection-snapshot" || ![1, 2].includes(manifest.schemaVersion) ||
      !/^[a-f0-9]{64}$/.test(manifest.snapshotId ?? "") || snapshotIdentity(manifest) !== manifest.snapshotId ||
      (expectedSnapshotId && manifest.snapshotId !== expectedSnapshotId) ||
      typeof manifest.publicationSourceRootDirectory !== "string" || !path.isAbsolute(manifest.publicationSourceRootDirectory) ||
      typeof manifest.preview !== "boolean" || !Array.isArray(manifest.files) || manifest.files.length !== registeredPaths.length) {
    throw new Error("Invalid selection snapshot identity or manifest.");
  }
  const sourceRoot = path.resolve(manifest.publicationSourceRootDirectory);
  if (publicationSourceRootDirectory && path.resolve(publicationSourceRootDirectory) !== sourceRoot) throw new Error("The source root differs from the reviewed selection snapshot.");
  if (manifest.preview && (!allowPreview || !repoRootDirectory || path.resolve(repoRootDirectory) !== manifest.previewSourceRootDirectory)) throw new Error("A preview snapshot requires explicit DM_BENCHMARK_PREVIEW=1 and its original preview source root.");
  if (!manifest.preview && manifest.previewSourceRootDirectory !== null) throw new Error("A non-preview snapshot cannot redirect immutable evidence.");
  const frozen = new Map();
  for (const [index, file] of manifest.files.entries()) {
    if (file.path !== registeredPaths[index] || typeof file.present !== "boolean") throw new Error("Selection snapshot paths differ from the registered selection allowlist.");
    if (!file.present) {
      if (file.bytes !== null || file.sha256 !== null) throw new Error("Invalid absent selection record.");
      frozen.set(file.path, null); continue;
    }
    const target = path.join(path.dirname(manifestPath), "selections", file.path);
    if (!fs.lstatSync(target).isFile()) throw new Error(`Frozen selection must be a regular file: ${file.path}`);
    const contents = fs.readFileSync(target);
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256 ?? "") || contents.length !== file.bytes || sha256(contents) !== file.sha256) throw new Error(`Frozen selection changed: ${file.path}`);
    frozen.set(file.path, contents);
  }
  const readFileSyncImplementation = (file, ...arguments_) => {
    const filePath = file instanceof URL ? fileURLToPath(file) : Buffer.isBuffer(file) ? file.toString() : file;
    if (typeof filePath !== "string") return fs.readFileSync(file, ...arguments_);
    const relative = path.relative(sourceRoot, path.resolve(filePath));
    if (frozen.has(relative)) {
      const contents = frozen.get(relative);
      if (contents === null) {
        const error = new Error(`ENOENT: frozen selection was absent: ${relative}`);
        Object.assign(error, { code: "ENOENT", errno: -2, syscall: "open", path: filePath }); throw error;
      }
      const options = arguments_[0];
      const encoding = typeof options === "string" ? options : options?.encoding;
      return encoding ? contents.toString(encoding) : Buffer.from(contents);
    }
    return fs.readFileSync(manifest.preview && relative.startsWith(DM_SNAPSHOT_PREFIX)
      ? path.join(manifest.previewSourceRootDirectory, relative) : file, ...arguments_);
  };
  return { manifest, identity: { path: manifestPath, sha256: manifestSha256, snapshotId: manifest.snapshotId, selectionCount: manifest.files.length },
    publicationSourceRootDirectory: sourceRoot, readFileSyncImplementation };
}

// Builds one retained, immutable candidate and serves only its release-qualified
// dependencies. No acceptance update, network upload or production mutation.
export async function rehearseRelease({ repoRootDirectory = process.cwd(), outputDirectory = process.argv[2] ?? "tmp/dungeon-master-release-proof", environmentVariables = process.env } = {}) {
const repo = path.resolve(repoRootDirectory);
const output = path.resolve(outputDirectory);
fs.mkdirSync(output, { recursive: true });
if (fs.existsSync(path.join(output, "candidate.json"))) throw new Error("Use a new proof directory; retained candidates are immutable.");
const { buildBenchmarkPublicationArtifact } = await import(pathToFileURL(path.join(repo, "cli/benchmark-publication-artifact.js")));
const publicationSourceRootDirectory = path.resolve(environmentVariables.DM_BENCHMARK_SOURCE_ROOT ?? repo);
const preview = environmentVariables.DM_BENCHMARK_PREVIEW === "1";
const selectionSnapshot = createSelectionSnapshot({ proofDirectory: output, publicationSourceRootDirectory, repoRootDirectory: repo, preview });
const publicationReadFileSyncImplementation = selectionSnapshot.readFileSyncImplementation;
const { buildBenchmarkPublicationProjection } = await import(pathToFileURL(path.join(repo, "cli/eval/benchmark-publication-projection.js")));
const projection = buildBenchmarkPublicationProjection({ repoRootDirectory: publicationSourceRootDirectory, readFileSyncImplementation: publicationReadFileSyncImplementation });
const generatedSources = [["data.js", projection.dataSource], ["responses.js", projection.responsesSource], ["writing-data.js", projection.writingDataSource], ["writing-responses.js", projection.writingResponsesSource], ["writing-creation-responses.js", projection.writingCreationResponsesSource], ...Object.entries(projection.writingAdditionalResponseSources)];
for (const [name, contents] of generatedSources) {
  fs.writeFileSync(path.join(repo, "site/vasirbenchmark.com", name), contents);
}
const artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory: repo, validateAcceptance: false, publicationSourceRootDirectory, publicationReadFileSyncImplementation });
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const infra = fs.readFileSync(path.join(repo, "site/vasirbenchmark.com/infra/production.yml"), "utf8");
const policySection = infra.slice(infra.indexOf("Name: vasirbenchmark-production-security-v1"));
const folded = policySection.match(/ContentSecurityPolicy: >-\n((?:[ ]{14}[^\n]+\n)+)/)?.[1];
if (!folded) throw new Error("Apex CSP not found in the current production template.");
const csp = folded.trim().split(/\n\s*/).join(" ");
const siteFiles = artifact.files.map(({ path: filePath, bytes, sha256, contentType, outputPath }) => ({ path: filePath, bytes, sha256, contentType, sourcePath: outputPath }));
const artifactFiles = (artifact.artifactFiles ?? []).map(({ key, bytes, sha256, contentType, outputPath }) => ({ key, bytes, sha256, contentType, sourcePath: outputPath }));
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(siteFiles.find(file => file.path === "data.js").sourcePath, "utf8"), sandbox);
const projectionSha256 = sha(JSON.stringify(sandbox.window.VASIR_DATA));
const manifest = { kind: "vasirbenchmark-local-artifact-rehearsal", schemaVersion: 1, releaseId: artifact.releaseId, projectionSha256, siteFiles, artifactFiles };
fs.writeFileSync(path.join(output, "local-artifacts.json"), JSON.stringify(manifest, null, 2) + "\n");
const candidate = { createdAt: new Date().toISOString(), releaseId: artifact.releaseId, directory: artifact.temporaryDirectory,
  publicationSourceRootDirectory, preview, selectionSnapshot: selectionSnapshot.identity,
  presentationSources: artifact.sourceManifest.filter(file => !generatedSources.some(([name]) => name === file.path)),
  infrastructureSources: ["deployment.json", "infra/production.yml"].map(file => { const contents = fs.readFileSync(path.join(repo, "site/vasirbenchmark.com", file)); return { path:file,bytes:contents.length,sha256:sha(contents) }; }),
  fileCount: artifact.fileCount, totalBytes: artifact.totalBytes, compressedLandingBytes: artifact.compressedLandingBytes,
  projectionSha256, csp, cspSha256: sha(csp), siteFiles, artifactFiles, routes: artifact.routes };
fs.writeFileSync(path.join(output, "candidate.json"), JSON.stringify(candidate, null, 2) + "\n");
const entries = new Map();
for (const file of siteFiles) {
  const contents = fs.readFileSync(file.sourcePath);
  if (contents.length !== file.bytes || sha(contents) !== file.sha256) throw new Error(`Candidate file changed: ${file.path}`);
  entries.set(`/releases/${artifact.releaseId}/${file.path}`, { file, contents });
  if (file.path.endsWith(".html")) entries.set(`/${file.path}`, { file, contents });
  if (file.path === "index.html") entries.set("/", { file, contents });
}
const requests = [];
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const entry = entries.get(pathname);
  requests.push({ at: new Date().toISOString(), path: pathname, status: entry ? 200 : 404 });
  if (!entry) { response.writeHead(404, { "Content-Type": "text/plain" }); response.end("Not in candidate"); return; }
  response.writeHead(200, { "Content-Type": entry.file.contentType, "Content-Security-Policy": csp, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
  response.end(entry.contents);
});
server.listen(0, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${server.address().port}`;
  fs.writeFileSync(path.join(output, "server.json"), JSON.stringify({ url, pid: process.pid, releaseId: artifact.releaseId }, null, 2));
  process.stdout.write(JSON.stringify({ url, output, releaseId: artifact.releaseId, fileCount: artifact.fileCount, totalBytes: artifact.totalBytes, compressedLandingBytes: artifact.compressedLandingBytes }) + "\n");
});
function close() { fs.writeFileSync(path.join(output, "requests.json"), JSON.stringify(requests, null, 2)); server.close(() => process.exit(0)); }
process.on("SIGTERM", close); process.on("SIGINT", close);

return { server, selectionSnapshot: selectionSnapshot.identity, candidate };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await rehearseRelease();
