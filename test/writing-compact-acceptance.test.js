import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { verifyCompactWritingProofEvidence } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';

const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const rubric = ['cause', 'character', 'reveal', 'clarity'].map(id => ({ id }));
  const configurationId = 'claude:claude-opus-5@low', caseId = 'place-generation', benchmarkId = 'writing-place-generation-v1';
  const scoreBasis = Object.fromEntries(['sourceSha256', 'manifestSha256', 'amendmentSha256', 'judgeValidationSha256'].map(key => [key, hash(key)]));
  const responses = ['baseline', 'skill'].map(condition => ({ caseId, configurationId, condition,
    outputText: condition + ' answer', provenance: { outputSha256: hash(condition + ' answer') }, judgments: [] }));
  const judgeRequests = ['astra', 'sol'].map((id, index) => {
    const candidateMap = index ? { A: 'skill', B: 'baseline' } : { A: 'baseline', B: 'skill' };
    const body = Object.fromEntries(['A', 'B'].map(candidate => ['assessment' + candidate, { candidateLabel: candidate,
      ratings: rubric.map(criterion => ({ criterionId: criterion.id, score: candidateMap[candidate] === 'baseline' ? 3 : 4 })) }]));
    const outputText = JSON.stringify(body), promptText = id + ' original prompt';
    return { id, caseId, configurationId, candidateMap, outputText, promptText, outputSha256: hash(outputText), promptSha256: hash(promptText),
      candidateResponseHashes: Object.fromEntries(Object.entries(candidateMap).map(([label, condition]) => [label, responses.find(response => response.condition === condition).provenance.outputSha256])) };
  });
  responses.forEach(response => response.judgments = judgeRequests.map(request => ({ requestId: request.id })));
  const publication = { publication: { adapter: 'writing-compact-v1' }, benchmarks: [{ id: benchmarkId }], scoreBasis,
    settings: [{ configurationId }], cases: [{ id: caseId, rubric }],
    caseResults: responses.map(response => ({ caseId, configurationId, condition: response.condition, exactScore: response.condition === 'baseline' ? 60 : 80 })) };
  const proof = { compactEvidenceHarnessSha256: hash('harness'), scoredBranchCoverage: { required: true },
    caseEvidence: [{ caseId, trialNumber: 1, rows: 1, sourceResponses: 2, judgments: 4, mismatches: [] }],
    compactCaseEvidence: [{ kind: 'vasirbenchmark-compact-writing-browser-evidence', benchmarkId, caseId, ...scoreBasis,
      answers: responses.map(response => ({ configurationId, condition: response.condition, outputSha256: response.provenance.outputSha256,
        requestIds: ['astra', 'sol'], exactScore: response.condition === 'baseline' ? 60 : 80 })),
      requests: judgeRequests.map(request => ({ requestId: request.id, promptSha256: request.promptSha256, outputSha256: request.outputSha256 })), mismatches: [] }] };
  return { proof, publication, archive: { responses, judgeRequests } };
}

test('compact acceptance independently reconstructs both scores from opposite-order original review JSON', () => {
  const { proof, publication, archive } = fixture();
  assert.doesNotThrow(() => verifyCompactWritingProofEvidence(proof, publication, archive));
});

test('compact acceptance rejects missing tasks, altered original bytes, substituted model scores and missing provenance', () => {
  for (const mutate of [
    x => x.proof.compactCaseEvidence.pop(),
    x => x.proof.compactCaseEvidence[0].answers.pop(),
    x => x.proof.compactCaseEvidence[0].requests.pop(),
    x => { x.proof.compactCaseEvidence[0].judgeValidationSha256 = hash('other'); },
    x => { delete x.proof.compactEvidenceHarnessSha256; },
    x => { x.proof.compactCaseEvidence[0].answers[1].exactScore = 95; },
    x => { x.publication.caseResults[1].exactScore = 95; x.proof.compactCaseEvidence[0].answers[1].exactScore = 95; },
    x => { x.archive.responses[0].outputText += ' changed'; },
    x => { x.archive.judgeRequests[0].outputText += ' changed'; },
    x => { x.archive.judgeRequests[0].candidateResponseHashes.A = hash('different answer'); },
    x => { x.proof.caseEvidence[0].judgments = 3; },
    x => { x.proof.compactCaseEvidence[0].mismatches.push('unverified'); },
    x => { x.proof.scoredBranchCoverage.required = false; }
  ]) {
    const x = clone(fixture()); mutate(x);
    assert.throws(() => verifyCompactWritingProofEvidence(x.proof, x.publication, x.archive));
  }
});
