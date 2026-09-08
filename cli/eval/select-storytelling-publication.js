import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { prepareWritingPublicationSource, WRITING_SELECTION_PATH } from "./writing-publication.js";
import { buildBenchmarkPublicationProjection } from "./benchmark-publication-projection.js";

const { values } = parseArgs({ options: { "run-directory": { type: "string" }, "project-root": { type: "string" } } });
if (!values["run-directory"]) throw new Error("Pass --run-directory with a frozen storytelling run checkpoint.");
const repoRootDirectory = path.resolve(values["project-root"] ?? process.cwd());
const selection = prepareWritingPublicationSource({ repoRootDirectory, runDirectory: path.resolve(repoRootDirectory, values["run-directory"]) });
fs.writeFileSync(path.join(repoRootDirectory, WRITING_SELECTION_PATH), `${JSON.stringify(selection, null, 2)}\n`);
const publication = buildBenchmarkPublicationProjection({ repoRootDirectory });
for (const [name, source] of [["data.js", publication.dataSource], ["responses.js", publication.responsesSource], ["writing-data.js", publication.writingDataSource], ["writing-responses.js", publication.writingResponsesSource]]) {
  fs.writeFileSync(path.join(repoRootDirectory, "site/vasirbenchmark.com", name), source);
}
process.stdout.write(`${JSON.stringify({ sourceSha256: selection.run.sha256, coverage: publication.writing.coverage, basisSha256: publication.basisSha256 })}\n`);
