import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const directory = path.resolve(process.argv[2] ?? ".agents/vasir-evals/dungeon-master-adventure-outline/dm-outline-v1-2026-09-08");
const destination = path.resolve(process.argv[3] ?? "docs/work/vasir-benchmarking/dungeon-master-adventure-outline/results");
const run = JSON.parse(fs.readFileSync(path.join(directory, "run.json")));
const judging = JSON.parse(fs.readFileSync(path.join(directory, "judges.json")));
const mean = values => values.length ? values.reduce((a,b) => a+b,0)/values.length : null;
const dimensions = run.benchmark.definition.scoring.dimensions;
const byRow = new Map(run.rows.map(row => [row.rowKey,row]));
const paired = judging.pairs.map(pair => {
  const reviews = pair.judges.filter(judge => judge.status === "completed");
  if (reviews.length !== 2) return null;
  const scores = {};
  const dimensionMeans = {};
  for (const condition of run.conditions) {
    const row = run.rows.find(row => row.caseId === pair.caseId && row.trialNumber === pair.trialNumber && row.conditionId === condition.id);
    assert.ok(row?.outputText);
    const assessments = reviews.map(review => review.assessments.find(assessment => assessment.rowKey === row.rowKey));
    assert.ok(assessments.every(Boolean));
    scores[condition.id] = mean(assessments.map(assessment => mean(assessment.dimensions.map(dimension => dimension.score))*20));
    dimensionMeans[condition.id] = Object.fromEntries(dimensions.map(d => [d.id,mean(assessments.map(assessment => assessment.dimensions.find(dimension => dimension.id === d.id).score))]));
  }
  const preferences = reviews.map(review => review.preference.winner === "tie" ? "tie" : byRow.get(review.candidateOrder[review.preference.winner === "A" ? 0 : 1]).conditionId);
  return { caseId: pair.caseId,trialNumber:pair.trialNumber,plain:scores.clean,skill:scores["skill:dungeon-master"],delta:scores["skill:dungeon-master"]-scores.clean,dimensions:dimensionMeans,preferences,
    scoreDirection: scores["skill:dungeon-master"]>scores.clean ? "skill" : scores["skill:dungeon-master"]<scores.clean ? "plain" : "tie",
    preferenceAgreement: preferences[0]===preferences[1] ? preferences[0] : "disagreement" };
}).filter(Boolean);
const summaries = run.benchmark.definition.cases.map(definition => {
  const pairs = paired.filter(pair => pair.caseId===definition.id);
  const rows=run.rows.filter(row=>row.caseId===definition.id);
  const conditions=Object.fromEntries(run.conditions.map(condition=>[condition.id,{meanWords:mean(rows.filter(row=>row.conditionId===condition.id&&row.rowStatus==="complete").map(row=>row.wordCount)),meanLatencyMs:mean(rows.filter(row=>row.conditionId===condition.id&&row.rowStatus==="complete").map(row=>row.durationMs))}]));
  const votes=pairs.flatMap(pair=>pair.preferences);
  return {caseId:definition.id,title:definition.title??definition.id,prompt:definition.task,expectedPairs:definition.repetitions,completePairs:pairs.length,plain:mean(pairs.map(pair=>pair.plain)),skill:mean(pairs.map(pair=>pair.skill)),delta:mean(pairs.map(pair=>pair.delta)),
    preferenceVotes:{skill:votes.filter(v=>v==="skill:dungeon-master").length,tie:votes.filter(v=>v==="tie").length,plain:votes.filter(v=>v==="clean").length},
    agreement:{skill:pairs.filter(pair=>pair.preferenceAgreement==="skill:dungeon-master").length,tie:pairs.filter(pair=>pair.preferenceAgreement==="tie").length,plain:pairs.filter(pair=>pair.preferenceAgreement==="clean").length,disagreement:pairs.filter(pair=>pair.preferenceAgreement==="disagreement").length},conditions,
    dimensions:Object.fromEntries(dimensions.map(d=>[d.id,{plain:mean(pairs.map(pair=>pair.dimensions.clean[d.id])),skill:mean(pairs.map(pair=>pair.dimensions["skill:dungeon-master"][d.id]))}]))};
});
const reviews=judging.pairs.flatMap(pair=>pair.judges).filter(judge=>judge.status==="completed");
const flags=Object.fromEntries(run.conditions.map(condition=>[condition.id,Object.fromEntries(["fundamentalRepairRequired","taskNoncompletion"].map(flag=>[flag,{flaggedAssessments:reviews.flatMap(review=>review.assessments).filter(assessment=>byRow.get(assessment.rowKey).conditionId===condition.id&&assessment[flag].value).length,totalAssessments:reviews.flatMap(review=>review.assessments).filter(assessment=>byRow.get(assessment.rowKey).conditionId===condition.id).length}]))]));
const report={runId:run.runId,manifestHash:run.manifestHash,skillHash:run.treatment.hash,generatedAt:new Date().toISOString(),generation:run.summary,judgingStatus:judging.status,completePairs:paired.length,completedJudgeSessions:reviews.length,summaries,pairs:paired,flags,
  failedGenerationAttempts:run.rows.flatMap(row=>row.attempts).filter(attempt=>attempt.status==="error").length,
  failedJudgingAttempts:judging.pairs.flatMap(pair=>pair.judges).flatMap(judge=>judge.attempts).filter(attempt=>attempt.status==="failed").length,
  limitations:["One requested generator model and effort: Astra Ultra.","Both independent judge seats use Astra Ultra; no human or different-model calibration.","Absolute scores are assessed within a blinded pair; pair order is counterbalanced.","No length cap; effects include extra context and reference-reading work.","Six primary repetitions and two per secondary prompt do not establish universal or live-table performance.","Baseline and treatment are independently sampled; individual differences also reflect generation variation."]};
fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,"results.json"),JSON.stringify(report,null,2)+"\n");
const fmt=value=>value===null?"—":value.toFixed(1);
const markdown=["# Dungeon Master adventure-outline benchmark","",`Run: ${run.runId}. ${paired.length}/16 matched pairs have both blind reviews. Scores are out of 100; primary-prompt results determine the headline score.`,"","| Prompt | Pairs | Plain | With skill | Difference | Judge preferences: skill / tie / plain |","| --- | ---: | ---: | ---: | ---: | ---: |",
  ...summaries.map(s=>`| ${s.title} | ${s.completePairs}/${s.expectedPairs} | ${fmt(s.plain)} | ${fmt(s.skill)} | ${s.delta!==null&&s.delta>0?"+":""}${fmt(s.delta)} | ${s.preferenceVotes.skill} / ${s.preferenceVotes.tie} / ${s.preferenceVotes.plain} |`),"","Preference counts are individual judge decisions, two per matched pair. They are not additional writing samples. Each pair's order is reversed for the second judge. Disagreements remain in the raw records.","","## Length and latency","","| Prompt | Plain words | Skill words | Plain seconds | Skill seconds |","| --- | ---: | ---: | ---: | ---: |",...summaries.map(s=>`| ${s.title} | ${fmt(s.conditions.clean.meanWords)} | ${fmt(s.conditions["skill:dungeon-master"].meanWords)} | ${fmt(s.conditions.clean.meanLatencyMs===null?null:s.conditions.clean.meanLatencyMs/1000)} | ${fmt(s.conditions["skill:dungeon-master"].meanLatencyMs===null?null:s.conditions["skill:dungeon-master"].meanLatencyMs/1000)} |`),"","## Limits","",...report.limitations.map(limit=>`- ${limit}`),""];
fs.writeFileSync(path.join(destination,"results.md"),markdown.join("\n"));
process.stdout.write(JSON.stringify({generation:report.generation,completePairs:paired.length,completedJudgeSessions:reviews.length,table:summaries.map(({caseId,completePairs,plain,skill,delta,preferenceVotes})=>({caseId,completePairs,plain,skill,delta,preferenceVotes}))},null,2)+"\n");
