import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Run only after the root's visual review of this exact candidate. This records
// standing publication authorization and agent review, not a new human review.
const repo = process.cwd();
const proof = path.resolve(process.argv[2] ?? "");
assert.ok(process.argv[2], "Provide the final proof directory.");
const site = path.join(repo,"site/vasirbenchmark.com");
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const read = file => JSON.parse(fs.readFileSync(file,"utf8"));
const pin = file => { const bytes=fs.readFileSync(file);return {path:path.relative(repo,file),bytes:bytes.length,sha256:hash(bytes)}; };
const candidate = read(path.join(proof,"candidate.json"));
assert.equal(candidate.preview,false,"Final publication must use actual selected source pins.");
assert.match(candidate.releaseId,/^[a-f0-9]{64}$/);
for(const record of [...candidate.presentationSources,...candidate.infrastructureSources]) {
  const actual=pin(path.join(site,record.path));assert.equal(actual.sha256,record.sha256,`Reviewed source changed: ${record.path}`);
}
const canonical=read(path.join(proof,"canonical/canonical-receipt.json"));
assert.equal(canonical.status,"passed");assert.equal(canonical.count,32);assert.equal(canonical.sourceUnchanged,true);
assert.equal(canonical.candidate.releaseId,candidate.releaseId);
assert.ok(canonical.results.every(result=>result.exitCode===0));
const expectedFiles=new Map(candidate.siteFiles.map(file=>[file.path,file]));
const writingProofs=[];
const gamesProofs=[];
const acceptedScreens=[];
const writingStates=["writing-models","writing-benchmarks","writing-efficiency","writing-efficiency-tokens","writing-report","writing-method","writing-rubric-anchors","writing-method-execution","writing-reference","writing-answer","writing-judgments","writing-judge-resources","writing-execution"];
const dmStates=["dungeon-master-models","dungeon-master-benchmarks","dungeon-master-efficiency","dungeon-master-report","dungeon-master-method","dungeon-master-answer","dungeon-master-judgments","dungeon-master-reference","dungeon-master-adherence"];
function copyScreens(directory,receipt,prefix,expected) {
  const selected=new Set(expected.map(name=>`${name}.png`));
  const observed=receipt.screenshots.map(item=>item.path);
  assert.equal(new Set(observed).size,observed.length,"Duplicate screenshot paths.");
  for(const name of selected) assert.ok(observed.includes(name),`Missing required capture: ${name}`);
  for(const image of receipt.screenshots) {
    const bytes=fs.readFileSync(path.join(directory,image.path));assert.equal(bytes.length,image.bytes);assert.equal(hash(bytes),image.sha256);
    assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16),receipt.width);assert.equal(bytes.readUInt32BE(20),receipt.height);
    if(!selected.has(image.path))continue;
    const destination=`${prefix ? `${prefix}-` : ""}${image.path}`;fs.copyFileSync(path.join(directory,image.path),path.join(site,destination));
    const isDm=receipt.benchmarkId==="dungeon-master-adventure-outline";
    const benchmarkId=isDm?"dungeon-master-adventure-outline":"storytelling-core-idea";
    const writingRoute=/-(models|benchmarks|efficiency(?:-tokens)?)\.png$/.exec(image.path)?.[1];
    const route=receipt.kind==="vasirbenchmark-games-browser-proof"?"/games.html?benchmark=2d-jumping-demo":writingRoute?`/#capabilities/writing${writingRoute==="models"?"":writingRoute==="benchmarks"?"/benchmarks":"/efficiency"}`:`/benchmark-report.html#${benchmarkId}`;
    acceptedScreens.push({path:destination,bytes:image.bytes,sha256:image.sha256,width:receipt.width,height:receipt.height,
      route});
  }
}
for(const [viewport,width,height] of [["desktop",1440,1000],["mobile",390,844],["tablet",820,1000]]) {
  for(const kind of ["story","twists","dm"]) {
    const directory=path.join(proof,`${kind}-${viewport}`),file=path.join(directory,"writing-browsercheck.json"),receipt=read(file);
    assert.equal(receipt.status,"passed");assert.equal(receipt.width,width);assert.equal(receipt.height,height);assert.equal(receipt.errors.length,0);
    assert.equal(receipt.harnessSha256,hash(fs.readFileSync(path.join(site,"writing-browsercheck.mjs"))));
    for(const loaded of receipt.loadedFiles) {
      const name=path.posix.basename(new URL(loaded.url).pathname),expected=expectedFiles.get(name);
      assert.ok(expected,`Unexpected loaded module: ${name}`);assert.equal(loaded.sha256,expected.sha256);
      assert.ok(new URL(loaded.url).pathname.startsWith(`/releases/${candidate.releaseId}/`));
    }
    if(kind==="dm") {
      assert.equal(receipt.benchmarkId,"dungeon-master-adventure-outline");
      assert.equal(receipt.coverage.responseCount,32);assert.equal(receipt.coverage.scoredResponseCount,32);assert.equal(receipt.coverage.judgmentCount,64);
    }
    if(kind==="twists") assert.ok(receipt.coverage.completedSettingCount>0,"Preserve the scored Plot Twists cohort.");
    writingProofs.push({...pin(file),benchmarkId:receipt.benchmarkId??(kind==="twists"?"storytelling-plot-twists":"storytelling-core-idea"),width,height,checks:receipt.checks.length});
    if(viewport!=="tablet"&&kind!=="twists")copyScreens(directory,receipt,viewport,kind==="dm"?dmStates:writingStates);
  }
}
for(const [viewport,width,height] of [["desktop",1440,1000],["mobile",390,844]]) {
  const directory=path.join(proof,`games-${viewport}`),file=path.join(directory,`games-browsercheck-${width}.json`),receipt=read(file);
  assert.equal(receipt.width,width);assert.equal(receipt.height,height);assert.equal(receipt.runtimeErrors.length,0);assert.equal(receipt.coverageFailures.length,0);
  assert.equal(receipt.projectionSha256,candidate.projectionSha256);
  assert.equal(receipt.delivery.mode,"local-pinned-bytes");assert.equal(receipt.delivery.failures.length,0);
  assert.equal(receipt.harnessSha256,hash(fs.readFileSync(path.join(site,"games-browsercheck.mjs"))));
  gamesProofs.push({...pin(file),width,height,checks:receipt.checks.length});
  const states=["games","games-ratings","games-playback","games-play","games-fullscreen"].map(state=>`${viewport}-${state}`);
  copyScreens(directory,{...receipt,screenshots:receipt.screenshots.filter(image=>states.includes(image.path.replace(/\.png$/,"")))},"",states);
}
const lockPath=path.join(site,"template-lock.json"),lock=read(lockPath);
const previous=structuredClone(lock);
const byPath=new Map(acceptedScreens.map(record=>[record.path,record]));
const existingPaths=lock.captures.map(record=>record.path);
const orderedPaths=[...existingPaths,...["desktop","mobile"].flatMap(viewport=>writingStates.map(state=>`${viewport}-${state}.png`)),...["desktop","mobile"].flatMap(viewport=>dmStates.map(state=>`${viewport}-${state}.png`))].filter((value,index,array)=>array.indexOf(value)===index);
lock.captures=orderedPaths.map(file=>{
  const record=byPath.get(file)??previous.captures.find(record=>record.path===file);assert.ok(record);
  const bytes=fs.readFileSync(path.join(site,file));return {...record,bytes:bytes.length,sha256:hash(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
});
const generated=new Set(["data.js","responses.js","writing-data.js","writing-responses.js"]);
const deployment=read(path.join(site,"deployment.json"));
const sources=[...deployment.publicFiles.map(file=>file.path).filter(file=>!generated.has(file)),"capture.mjs","capture.sh","games-browsercheck.mjs","writing-browsercheck.mjs"].sort();
lock.files=sources.map(file=>{const bytes=fs.readFileSync(path.join(site,file));return {path:file,bytes:bytes.length,sha256:hash(bytes)};});
lock.version=`2026-09-08-dungeon-master-${candidate.releaseId.slice(0,12)}`;
lock.status="accepted";
lock.acceptance={authority:"user",acceptedAt:new Date().toISOString(),kind:"vasirbenchmark-dungeon-master-presentation-acceptance",
  verdict:"The authorized Dungeon Master benchmark is complete and its exact candidate was reviewed by the agent; incumbent benchmark selections and scores are preserved.",
  response:"Add a benchmark to https://vasirbenchmark.com as a writing benchmark for DUNGEON MASTER category; run fresh-agent comparisons and return a performance table.",
  basis:"The user's explicit instruction authorizes publication. Visual inspection and these source-bound browser receipts were performed by the agent. This does not claim new human screenshot approval or validate tabletop performance.",
  visualReview:{reviewer:"agent",humanScreenshotApproval:false,referenceReadUncertaintyReviewed:true},
  verification:{releaseId:candidate.releaseId,candidate:pin(path.join(proof,"candidate.json")),canonical:pin(path.join(proof,"canonical/canonical-receipt.json")),writingProofs,gamesProofs,dmResponseCount:32,dmJudgeAssessmentCount:64,dmPairCount:16}};
fs.writeFileSync(path.join(proof,"previous-template-lock.json"),JSON.stringify(previous,null,2)+"\n");
fs.writeFileSync(lockPath,JSON.stringify(lock,null,2)+"\n");
process.stdout.write(JSON.stringify({releaseId:candidate.releaseId,files:lock.files.length,captures:lock.captures.length,receipt:pin(lockPath)})+"\n");
