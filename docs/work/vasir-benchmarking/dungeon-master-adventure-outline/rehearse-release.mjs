import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

// Builds one retained, immutable candidate and serves only its release-qualified
// dependencies. No acceptance update, network upload or production mutation.
const repo = process.cwd();
const output = path.resolve(process.argv[2] ?? "tmp/dungeon-master-release-proof");
fs.mkdirSync(output, { recursive: true });
if (fs.existsSync(path.join(output, "candidate.json"))) throw new Error("Use a new proof directory; retained candidates are immutable.");
const { buildBenchmarkPublicationArtifact } = await import(pathToFileURL(path.join(repo, "cli/benchmark-publication-artifact.js")));
const publicationSourceRootDirectory = path.resolve(process.env.DM_BENCHMARK_SOURCE_ROOT ?? repo);
const preview = process.env.DM_BENCHMARK_PREVIEW === "1";
const publicationReadFileSyncImplementation = (file, ...arguments_) => {
  const relative = path.relative(publicationSourceRootDirectory, file);
  const selected = relative === "benchmarks/dungeon-master-adventure-outline/publication.json" || relative.startsWith(".agents/vasir-evals/dungeon-master-adventure-outline/publication-snapshots/");
  return fs.readFileSync(preview && selected ? path.join(repo, relative) : file, ...arguments_);
};
const { buildBenchmarkPublicationProjection } = await import(pathToFileURL(path.join(repo, "cli/eval/benchmark-publication-projection.js")));
const projection = buildBenchmarkPublicationProjection({ repoRootDirectory: publicationSourceRootDirectory, readFileSyncImplementation: publicationReadFileSyncImplementation });
for (const [name, contents] of [["data.js", projection.dataSource], ["responses.js", projection.responsesSource], ["writing-data.js", projection.writingDataSource], ["writing-responses.js", projection.writingResponsesSource]]) {
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
  publicationSourceRootDirectory, preview,
  presentationSources: artifact.sourceManifest.filter(file => !["data.js", "responses.js", "writing-data.js", "writing-responses.js"].includes(file.path)),
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
