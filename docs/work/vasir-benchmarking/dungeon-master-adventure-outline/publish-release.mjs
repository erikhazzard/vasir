import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
const { values } = parseArgs({ options: {
  "dry-run": {type:"boolean",default:false},
  "expected-release": {type:"string"},
  output: {type:"string"}
} });
if (!/^[a-f0-9]{64}$/.test(values["expected-release"] ?? "") || !values.output) throw new Error("Pass the reviewed --expected-release and an --output receipt path.");
const repoRootDirectory = process.cwd();
const publicationSourceRootDirectory = path.resolve(process.env.DM_BENCHMARK_SOURCE_ROOT ?? repoRootDirectory);
const { publishBenchmarkSite } = await import(pathToFileURL(path.join(repoRootDirectory,"cli/benchmark-publish.js")));
const { buildBenchmarkPublicationArtifact } = await import(pathToFileURL(path.join(repoRootDirectory,"cli/benchmark-publication-artifact.js")));
const progress = [];
const startedAt = new Date().toISOString();
try {
  const result = await publishBenchmarkSite({ repoRootDirectory, dryRun:values["dry-run"], fullAudit:true,
    buildArtifactImplementation: options=>buildBenchmarkPublicationArtifact({...options,publicationSourceRootDirectory}), onProgress:event => {
    progress.push({...event,at:new Date().toISOString()});
    if (event.id === "build-artifact" && event.detail !== values["expected-release"]) throw new Error("The source or presentation changed after review; no AWS action was started. Rehearse the new candidate.");
    process.stdout.write(JSON.stringify(event)+"\n");
  } });
  fs.mkdirSync(path.dirname(path.resolve(values.output)),{recursive:true});
  fs.writeFileSync(values.output,JSON.stringify({startedAt,completedAt:new Date().toISOString(),publicationSourceRootDirectory,expectedRelease:values["expected-release"],progress,result},null,2)+"\n");
  process.stdout.write(JSON.stringify({status:result.status,dryRun:values["dry-run"],artifact:result.artifact,verification:result.verification})+"\n");
} catch(error) {
  fs.mkdirSync(path.dirname(path.resolve(values.output)),{recursive:true});
  fs.writeFileSync(values.output,JSON.stringify({startedAt,completedAt:new Date().toISOString(),expectedRelease:values["expected-release"],progress,error:{code:error.code??null,message:error.message,context:error.context??null}},null,2)+"\n");
  throw error;
}
