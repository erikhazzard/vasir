import fs from "node:fs";
import path from "node:path";
import { buildStorytellingCreationPublication } from "../../../../cli/eval/storytelling-creation-publication.js";

// Run only after the immutable source selection has been created. Scores are
// derived by the same strict projector used for publication, never hand-edited.
const result = buildStorytellingCreationPublication({ repoRootDirectory: process.cwd() });
if (!result) throw new Error("No selected magic-discovery publication.");
const p = result.projection;
if (!p.coverage.executionComplete) throw new Error("The benchmark is not terminal; do not issue a final report.");
const output = path.join(process.cwd(), "docs/work/vasir-benchmarking/storytelling-magic-discovery/results");
fs.mkdirSync(output, { recursive: true });
const n = value => Number.isFinite(value) ? value.toFixed(1) : "—";
const signed = value => Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(1)}` : "—";
const records = p.settings.map(setting => {
  const baseline = p.entries.find(entry => entry.settingId === setting.id && entry.condition === "baseline");
  const skill = p.entries.find(entry => entry.settingId === setting.id && entry.condition === "skill");
  return { configurationId: setting.configurationId, label: setting.label, rank: skill.rank,
    plain: baseline.exactScore, skill: skill.exactScore, uplift: Number.isFinite(skill.exactScore) && Number.isFinite(baseline.exactScore) ? skill.exactScore - baseline.exactScore : null,
    contexts: { plain: baseline.contextScores, skill: skill.contextScores },
    trialEffects: p.trialEffects.find(effect => effect.settingId === setting.id) };
}).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.configurationId.localeCompare(b.configurationId));
const summary = { benchmarkId: p.benchmarks[0].id, generatedAt: new Date().toISOString(),
  sourcePins: result.sourcePins, coverage: p.coverage, summary: p.benchmarkSummaries[0], contextSummaries: p.contextSummaries,
  configurations: records, limitations: p.methodology.limitations };
fs.writeFileSync(path.join(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
const report = ["# First discovery of magic — creation benchmark", "", p.benchmarks[0].prompt, "",
  `33 exact model settings × 3 fresh trials × 2 conditions. ${p.coverage.responseCount}/198 final answers; ${p.coverage.judgmentCount}/792 answer assessments. Four fresh blind seats cross two judge models with skill-naive and skill-informed context.`, "",
  "Scores are the equal mean of four ten-dimension reviews, then the mean of three complete paired trials. Missing results remain unranked, not zero. Naive means no supplied skill context in this experiment, not absence of prior training exposure.", "",
  "| Rank | Model setting | Plain /100 | Skill /100 | Uplift |", "| --- | --- | ---: | ---: | ---: |",
  ...records.map(row => `| ${row.rank ?? "—"} | ${row.label} | ${n(row.plain)} | ${n(row.skill)} | ${signed(row.uplift)} |`), "",
  "## Interpretation limits", "", ...p.methodology.limitations.map(line => `- ${line}`), "",
  "The JSON companion retains separate context means and all three raw trial differences with descriptive variation. No confidence interval, statistical-significance claim, or general-writing ranking is inferred from this single brief.", "",
  "Original outlines, exact judge reviews, frozen skill context, and losslessly reconstructed judge prompts are available on the benchmark report. Failed attempts are retained in the source evidence.", ""
].join("\n");
fs.writeFileSync(path.join(output, "README.md"), report);
console.log(JSON.stringify({ output, coverage: p.coverage, summary: p.benchmarkSummaries[0], contextSummaries: p.contextSummaries }, null, 2));
