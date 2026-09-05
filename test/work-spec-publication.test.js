import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildWorkSpecPublication, prepareWorkSpecPublicationSource, validateWorkSpecPublication } from "../cli/eval/work-spec-publication.js";
import { buildBenchmarkPublicationProjection, validateBenchmarkPublicationProjection, validateBenchmarkPublicationResponses } from "../cli/eval/benchmark-publication-projection.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = text => crypto.createHash("sha256").update(text).digest("hex");
const config = { id: "codex:gpt-5.6-sol@high", provider: "codex", model: "gpt-5.6-sol", reasoning: "high" };
const judges = [
  { id: "codex:gpt-6-astra@xhigh", provider: "codex", model: "gpt-6-astra", reasoning: "xhigh" },
  { id: "claude:claude-fable-5-1@max", provider: "claude", model: "claude-fable-5-1", reasoning: "max" }
];
const track = JSON.parse(fs.readFileSync(path.join(REPO, "benchmarks/capability-taxonomy.json"))).categories.find(candidate => candidate.id === "work-specification");
const inputs = { task: "Create a useful work spec.\n", treatment: "Preserve the requested user journey.\n", rubric: "V25 G15 A20 D15 S15 C10; ratings 0 to 4.\n", adapter: "Judge only this anonymous candidate.\n" };
const numbered = (text, prefix) => text.split("\n").map((line, index) => `${prefix}${String(index + 1).padStart(3, "0")} ${line}`).join("\n");

function createEvidence(t, { unassessable = false, invalidStatus = false, candidateSuffix = "" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-work-spec-publication-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const artifactRoot = "tmp/controlled-run";
  const write = (relative, contents) => { const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, typeof contents === "string" ? contents : `${JSON.stringify(contents, null, 2)}\n`); };
  const writeEvidence = (relative, contents) => write(`${artifactRoot}/${relative}`, contents);
  const manifest = { case: "work-spec-chat", authoredScenario: true, developmentCase: true, configurations: [config], judges, cells: [{ id: "aa", configuration: config, condition: "baseline", trial: 1 }, { id: "bb", configuration: config, condition: "skill", trial: 1 }], neutralHarness: "Produce the requested document.", outputContract: "Return the complete spec.", treatment: { sha256: hash(inputs.treatment) }, files: [] };
  writeEvidence("manifest.json", manifest);
  for (const [key, filename] of Object.entries({ task: "task.md", treatment: "treatment-bundle.md", rubric: "judge-rubric.md", adapter: "judge-adapter.txt" })) writeEvidence(`inputs/${filename}`, inputs[key]);
  const definition = { ...JSON.parse(fs.readFileSync(path.join(REPO, "benchmarks/work-spec-chat/publication.json"))), inputSha256: Object.fromEntries(Object.entries(inputs).map(([key, text]) => [key, hash(text)])), generationContractSha256: hash(JSON.stringify({ neutralHarness: manifest.neutralHarness, outputContract: manifest.outputContract })) };
  write("benchmarks/work-spec-chat/publication.json", definition);
  write("benchmarks/capability-taxonomy.json", { categories: [track] });
  function invocation(directory, configuration, prompt, text) {
    const receipt = { cli: configuration.provider, freshSession: true, persistedSession: false, nonMessageItemCount: 0, requestedReasoning: configuration.reasoning, effectiveEffort: configuration.reasoning, allowedTools: [] };
    const result = { text, usage: { inputTokens: 110, outputTokens: 20, totalTokens: 130 }, durationMs: 1250, costUsd: null, runtimeReceipt: receipt, attempt: 1, promptSha256: hash(prompt), answerSha256: hash(text) };
    writeEvidence(`${directory}/result.json`, result);
    writeEvidence(`${directory}/attempt-1/prompt.txt`, prompt);
    writeEvidence(`${directory}/attempt-1/answer.txt`, text);
    writeEvidence(`${directory}/attempt-1/process-1.json`, { command: configuration.provider, args: ["--model", configuration.model, ...(configuration.provider === "codex" ? ["--ephemeral", "--config", `model_reasoning_effort="${configuration.reasoning}"`] : ["--effort", configuration.reasoning])] });
    return result;
  }
  for (const cell of manifest.cells) {
    const answer = `# Spec ${cell.id}\nA user begins at the normal entrypoint and completes the requested action.${candidateSuffix}`;
    const candidate = `${answer}\n`;
    const guidance = cell.condition === "skill" ? `\n\n--- Vasir Skill Guidance Start ---\n${inputs.treatment.trim()}\n--- Vasir Skill Guidance End ---` : "";
    const prompt = `${manifest.neutralHarness}${guidance}\n\nTask:\n${inputs.task.trim()}\n\nOutput contract:\n${manifest.outputContract}\n`;
    invocation(`generations/${cell.id}`, config, prompt, answer);
    writeEvidence(`generations/${cell.id}/spec.md`, candidate);
    for (const [index, judge] of judges.entries()) {
      const unavailable = unassessable && cell.condition === "skill" && index === 1;
      const invalidCandidate = invalidStatus && cell.condition === "skill" && index === 1;
      const dimensions = Object.fromEntries(["V", "G", "A", "D", "S", "C"].map(id => [id, { rating: unavailable && id === "V" ? null : index === 1 ? 3 : cell.condition === "baseline" && id === "V" ? 2 : 4, reason: `${id} is supported by the candidate journey.`, evidence: ["B001 and L002: the requested action."] }]));
      const total = unavailable ? null : index === 1 ? 75 : cell.condition === "baseline" ? 87.5 : 100;
      const assessment = { assessment: { mode: "controlled", status: invalidCandidate ? "invalid candidate" : unavailable ? "partially assessable" : "assessable", limitations: unavailable || invalidCandidate ? [{ criterion: "V", missing_evidence: "The beneficiary cannot be recovered.", owner: "candidate" }] : [], verification: [] }, value: { beneficiary: "A user", need: "Complete the action", outcome: "Action complete", causal_connection: "The entrypoint leads to the action.", evidence: ["B001"] }, dimensions, findings: index === 1 && !unavailable && !invalidCandidate ? [{ id: "F1", severity: "blocker", dimension: "V", candidate_evidence: "The required failure outcome is omitted at L002.", source_basis: "B001 requires the complete action.", consequence: "The user could complete a different action.", smallest_correction: "Restore the required outcome." }] : [], result: { benchmark_total: index === 1 && !unavailable ? 100 : total, readiness: index === 0 ? "Implement as written" : unavailable || invalidCandidate ? "Not assessable" : "Fix spec first", decision_dependency: null, priority_finding_ids: [] } };
      const judgePrompt = `${inputs.adapter}\n--- Frozen rubric ---\n${inputs.rubric}\n--- Assigned task ---\n${numbered(inputs.task, "B")}\n--- Anonymous candidate ---\n${numbered(candidate, "L")}\n--- End candidate ---\nApply the rubric and return the required JSON assessment.\n`;
      const directory = `judgments/${cell.id}/judge-${index + 1}`;
      invocation(directory, judge, judgePrompt, JSON.stringify(assessment));
      writeEvidence(`${directory}/assessment.json`, { ...assessment, host: { benchmark_total: total, judge_reported_total: assessment.result.benchmark_total, arithmeticMatches: total === assessment.result.benchmark_total, candidateSha256: hash(candidate), adapterSha256: hash(inputs.adapter) } });
    }
  }
  const prepare = options => prepareWorkSpecPublicationSource({ repoRootDirectory: root, artifactRoot, runId: "controlled-test-run", expectedConfigurationIds: [config.id], ...options });
  const build = selection => buildWorkSpecPublication({ repoRootDirectory: root, selection, track });
  return { root, artifactRoot, manifest, writeEvidence, prepare, build };
}

test("work-spec publication recomputes independent weighted scores, preserves readiness conflicts and exact source evidence", t => {
  const evidence = createEvidence(t);
  const selection = evidence.prepare();
  const { projection, responseBundle } = evidence.build(selection);
  assert.deepEqual(projection.settings[0].scores, { baseline: 81.3, skill: 87.5 });
  assert.equal(projection.settings[0].deltas.skill, 6.3, "uplift uses the unrounded matched scores");
  assert.equal(projection.benchmarkResults[0].exactScore, 81.25);
  assert.equal(projection.benchmarkResults[0].dimensions.V, 2.5);
  assert.equal(projection.entries[0].readinessLabel, "Readiness unresolved");
  assert.deepEqual(projection.entries[0].coverage, { expectedJudgments: 2, completedJudgments: 2, assessableJudgments: 2 });
  assert.equal(projection.entries[0].tokens, 20, "the displayed token axis remains output tokens");
  assert.equal(responseBundle.responses[0].judgments[1].score, 75);
  assert.equal(responseBundle.responses[0].judgments[1].assessment.result.benchmark_total, 100, "judge arithmetic errors remain visible alongside host arithmetic");
  assert.equal(responseBundle.responses[0].judgments[1].assessment.host.arithmeticMatches, false);
  assert.equal(Object.hasOwn(responseBundle.responses[0].judgments[0], "gateCap"), false);
  assert.equal(projection.scoreBasis.gates, null);
  assert.equal(responseBundle.counts.judgments, 4);
  assert.deepEqual(evidence.prepare(), selection, "pinning identical source is idempotent");
});

test("substantively unassessable candidates retain both judgments without a score, uplift, or rank", t => {
  const evidence = createEvidence(t, { unassessable: true });
  const { projection, responseBundle } = evidence.build(evidence.prepare());
  const skill = projection.entries.find(entry => entry.condition === "skill");
  assert.equal(skill.score, null);
  assert.equal(skill.delta, null);
  assert.equal(skill.rank, null);
  assert.equal(skill.coverage.completedJudgments, 2);
  assert.equal(skill.coverage.assessableJudgments, 1);
  const response = responseBundle.responses.find(response => response.condition === "skill");
  assert.equal(response.judgments[1].assessment.dimensions.V.rating, null);
  assert.equal(response.judgments[1].assessment.assessment.limitations[0].owner, "candidate");
});

test("authored lowercase users API routes are publishable while literal private home paths are rejected", t => {
  const allowed = createEvidence(t, { candidateSuffix: "\nGET /users/me\nGET /users/lookup?handle=friend" });
  const built = allowed.build(allowed.prepare());
  assert.match(built.responseBundle.responses[0].outputText, /GET \/users\/me/);
  assert.match(built.responseBundle.responses[0].outputText, /GET \/users\/lookup\?handle=friend/);
  const privateHome = createEvidence(t, { candidateSuffix: "\nRead /Users/private-user/code/work-spec.md" });
  assert.throws(() => privateHome.prepare(), /private paths/);
});

test("source pins reject changed evidence and incomplete or substituted cohorts", async t => {
  await t.test("changed retained answer", t => {
    const evidence = createEvidence(t), selection = evidence.prepare();
    evidence.writeEvidence("generations/aa/spec.md", "Rewritten after selection.\n");
    assert.throws(() => evidence.build(selection), /digest or byte length changed/);
  });
  await t.test("missing judge", t => {
    const evidence = createEvidence(t);
    fs.rmSync(path.join(evidence.root, evidence.artifactRoot, "judgments/bb/judge-2/assessment.json"));
    assert.throws(() => evidence.prepare(), /required source is unavailable/);
    assert.equal(fs.existsSync(path.join(evidence.root, ".agents/vasir-evals/work-spec-chat/controlled-test-run/run.json")), false);
  });
  await t.test("missing requested configuration", t => {
    const evidence = createEvidence(t);
    assert.throws(() => evidence.prepare({ expectedConfigurationIds: [config.id, "codex:gpt-5.6-sol@max"] }), /cohort or paired matrix is incomplete/);
  });
  await t.test("mislabeled effort", t => {
    const evidence = createEvidence(t);
    evidence.writeEvidence("generations/aa/attempt-1/process-1.json", { command: "codex", args: ["--model", config.model, "--ephemeral", "--config", 'model_reasoning_effort="low"'] });
    assert.throws(() => evidence.prepare(), /declared effort/);
  });
  await t.test("changed condition prompt even with matching result hash", t => {
    const evidence = createEvidence(t);
    const resultPath = path.join(evidence.root, evidence.artifactRoot, "generations/aa/result.json");
    const result = JSON.parse(fs.readFileSync(resultPath));
    const changedPrompt = "A different task and unauthorized guidance.";
    result.promptSha256 = hash(changedPrompt);
    evidence.writeEvidence("generations/aa/result.json", result);
    evidence.writeEvidence("generations/aa/attempt-1/prompt.txt", changedPrompt);
    assert.throws(() => evidence.prepare(), /effective prompt differs/);
  });
});

test("an invalid-candidate status retains recorded numeric ratings while withholding comparable score", t => {
  const evidence = createEvidence(t, { invalidStatus: true });
  const { projection, responseBundle } = evidence.build(evidence.prepare());
  const skill = projection.entries.find(entry => entry.condition === "skill");
  const judgment = responseBundle.responses.find(response => response.condition === "skill").judgments[1];
  assert.equal(judgment.assessmentStatus, "invalid candidate");
  assert.equal(judgment.rawScore, 75);
  assert.equal(judgment.score, null);
  assert.equal(judgment.dimensions.V.rating, 3);
  assert.equal(skill.score, null);
  assert.equal(skill.delta, null);
  assert.equal(skill.rank, null);
  assert.equal(skill.coverage.completedJudgments, 2);
});

test("the public validators reject forged workflow score, readiness, and response mappings", t => {
  const evidence = createEvidence(t);
  const built = evidence.build(evidence.prepare());
  for (const corrupt of [
    value => { value.projection.benchmarkResults[0].score = 100; },
    value => { value.projection.entries[0].score = 0; value.projection.entries[0].delta = 100; },
    value => { value.projection.entries[0].readinessLabel = "Implement as written"; },
    value => { value.responseBundle.responses[0].readinessLabel = "Implement as written"; },
    value => { delete value.responseBundle.responses[0].judgments[0].assessment.value; },
    value => { value.projection.benchmarkSummaries[0].baseline = 1; },
    value => { value.projection.settings[0].deltas.skill = 90; },
    value => { value.projection.benchmarkResults[0].readinessConflict = false; },
    value => { value.responseBundle.responses[0].outputText += " altered"; },
    value => { value.responseBundle.responses[0].judgments.reverse(); },
    value => { value.responseBundle.responses[0].judgments[0].score = 1; }
  ]) {
    const changed = structuredClone(built); corrupt(changed);
    assert.throws(() => validateWorkSpecPublication(changed.projection, changed.responseBundle), /Work-spec publication:/);
  }
});

test("canonical publication appends an independent workflow family without changing Engineering measurements or evidence", t => {
  const evidence = createEvidence(t), selection = evidence.prepare();
  const oldSelection = JSON.parse(fs.readFileSync(path.join(REPO, "benchmarks/public-results.json")));
  const engineeringSelection = { kind: oldSelection.kind, schemaVersion: 1, selectedRuns: oldSelection.selectedRuns };
  const previous = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO, readFileSyncImplementation: (filePath, encoding) => path.relative(REPO, filePath) === "benchmarks/public-results.json" ? JSON.stringify(engineeringSelection) : fs.readFileSync(filePath, encoding) });
  const merged = { ...engineeringSelection, schemaVersion: 2, workSpecRun: selection };
  const readFileSyncImplementation = (filePath, encoding) => {
    const relative = path.relative(REPO, filePath);
    if (relative === "benchmarks/public-results.json") return JSON.stringify(merged);
    const local = path.join(evidence.root, relative);
    if (relative !== "benchmarks/capability-taxonomy.json" && fs.existsSync(local)) return fs.readFileSync(local, encoding);
    return fs.readFileSync(filePath, encoding);
  };
  const built = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO, readFileSyncImplementation });
  const { aiWorkflows, ...engineering } = built.projection;
  const { aiWorkflows: workflowResponses, ...engineeringResponses } = built.responseBundle;
  assert.deepEqual({ ...engineering, schemaVersion: 2 }, previous.projection);
  assert.deepEqual({ ...engineeringResponses, schemaVersion: 2 }, previous.responseBundle);
  assert.equal(aiWorkflows.counts.settings, 1);
  assert.equal(workflowResponses.counts.judgments, 4);
  assert.equal(built.counts.benchmarks, 4);
  assert.equal(built.counts.responses, 218);
  assert.equal(built.counts.settings, 36, "shared configurations are not double counted across families");
  assert.ok(built.routes.familyFragments.includes("/#capabilities/ai-workflows"));
  assert.ok(built.routes.reportFragments.includes("/benchmark-report.html#work-spec-chat"));
  validateBenchmarkPublicationProjection(built.projection);
  validateBenchmarkPublicationResponses(built.responseBundle, built.projection);
});
