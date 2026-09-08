import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { prepareWritingPublicationSource, writingSelectionPath, WRITING_BENCHMARK_ID } from "./writing-publication.js";
import { buildBenchmarkPublicationProjection } from "./benchmark-publication-projection.js";

const { values } = parseArgs({ options: { "run-directory": { type: "string" }, "project-root": { type: "string" }, benchmark: { type: "string" } } });
if (!values["run-directory"]) throw new Error("Pass --run-directory with a frozen storytelling run checkpoint.");
const repoRootDirectory = path.resolve(values["project-root"] ?? process.cwd());
const benchmarkId = values.benchmark ?? WRITING_BENCHMARK_ID;
const selection = prepareWritingPublicationSource({ repoRootDirectory, benchmarkId, runDirectory: path.resolve(repoRootDirectory, values["run-directory"]) });
fs.writeFileSync(path.join(repoRootDirectory, writingSelectionPath(benchmarkId)), `${JSON.stringify(selection, null, 2)}\n`);
const publication = buildBenchmarkPublicationProjection({ repoRootDirectory });
for (const [name, source] of [["data.js", publication.dataSource], ["responses.js", publication.responsesSource], ["writing-data.js", publication.writingDataSource], ["writing-responses.js", publication.writingResponsesSource]]) {
  fs.writeFileSync(path.join(repoRootDirectory, "site/vasirbenchmark.com", name), source);
}
const selectedProjection = publication.writing.benchmarks[0].id === benchmarkId ? publication.writing
  : publication.writing.benchmarkPublications?.find(item => item.benchmarkId === benchmarkId)?.projection;
if (!selectedProjection) throw new Error("The selected Storytelling benchmark is absent from the generated collection.");
process.stdout.write(`${JSON.stringify({ benchmarkId, sourceSha256: selection.run.sha256, coverage: selectedProjection.coverage, basisSha256: publication.basisSha256 })}\n`);
