import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/benchmark-report.js', import.meta.url), 'utf8');
const start = runtime.indexOf('  const writingProgressMarkup = ');
assert.ok(start >= 0, 'The shared Writing progress renderer must be present.');
const renderer = runtime.slice(start, runtime.indexOf('\n  const ', start + 1));
const cells = counts => Object.entries(counts).flatMap(([status, count]) => Array.from({ length: count }, () => ({ status })));

function render(data, { isCreation = false, judgeCount = 2 } = {}) {
  const before = JSON.stringify(data);
  const writingFinalExclusions = data.coverage.executionStatus === 'complete-with-exclusions';
  const html = vm.runInNewContext(`${renderer}\nwritingProgressMarkup()`, {
    data, isWriting: true, isCreation, JUDGE_COUNT: judgeCount, writingFinalExclusions,
    writingInProgress: !data.coverage.executionComplete,
    writingProgressStatus: writingFinalExclusions ? 'FINAL SNAPSHOT' : data.coverage.executionComplete ? 'COMPLETE SNAPSHOT' : 'INCOMPLETE SNAPSHOT',
    escapeHTML: value => String(value)
  });
  assert.equal(JSON.stringify(data), before, 'Rendering must not rewrite coverage, statuses or scores.');
  return html;
}

test('Twists displays pending-status cells separately from failures, not the broader unresolved count', () => {
  const data = {
    caseResults: cells({ scored: 476, unscored: 44, pending: 132, error: 8 }),
    coverage: { responseCount: 520, expectedResponseCount: 660, scoredResponseCount: 476,
      judgmentCount: 952, expectedJudgmentCount: 1320, completedSettingCount: 23,
      pendingGenerationCount: 140, terminalGenerationFailureCount: 0,
      executionComplete: false, executionStatus: 'in-progress' }
  };
  const html = render(data);
  assert.match(html, /132 generations are pending\. 8 failed generations are retained; planned totals include unavailable slots\./);
  assert.doesNotMatch(html, /140 generations|refusal|terminal generation failures|No judge reviews are pending/);
  assert.match(html, /520\/660 final answers/);
  assert.match(html, /952\/1320 planned judge reviews/);
  assert.match(html, /476\/660 complete 2-judge answer panels/);
  assert.match(html, /Case scores require the full judge panel\. Incomplete configurations are not ranked\./);
});

test('only pending statuses enter the new count; running, failed and unscored cells remain distinct', () => {
  const html = render({
    caseResults: cells({ pending: 1, running: 2, error: 2, unavailable: 1, unscored: 1 }),
    coverage: { responseCount: 1, expectedResponseCount: 7, scoredResponseCount: 0,
      judgmentCount: 0, expectedJudgmentCount: 14, executionComplete: false }
  });
  assert.match(html, /1 generation is pending\. 3 failed generations are retained/);
  assert.doesNotMatch(html, /[2367] generations are pending/);
});

test('fresh paired Plot twists distinguishes twelve review calls from twenty-four answer assessments', () => {
  const html = render({ scoreBasis: { edition: 'storytelling-plot-twists-paired-v2' }, caseResults: cells({ scored: 12 }),
    coverage: { responseCount: 12, expectedResponseCount: 12, scoredResponseCount: 12, judgmentCount: 24,
      expectedJudgmentCount: 24, pairedJudgeCallCount: 12, expectedPairs: 6, executionComplete: true } });
  assert.match(html, /12\/12 final answers/);
  assert.match(html, /24\/24 planned answer assessments/);
  assert.match(html, /12\/12 blind pair reviews/);
  assert.match(html, /12\/12 complete 2-judge answer panels/);
  assert.doesNotMatch(html, /24\/24 planned judge reviews|full-read|pending|failed generations/);
});

test('original final full-read exclusions retain their disclosure without a pending-generation label', () => {
  const html = render({
    caseResults: cells({ scored: 76, unscored: 2, error: 2 }),
    coverage: { responseCount: 80, expectedResponseCount: 80, scoredResponseCount: 76,
      validResponseCount: 78, terminalGenerationFailureCount: 2, terminallyExcludedJudgmentCount: 8,
      judgmentCount: 152, expectedJudgmentCount: 160, executionComplete: true, executionStatus: 'complete-with-exclusions' }
  });
  assert.match(html, /78 valid final answers; 2 failed full-read verifications are retained/);
  assert.match(html, /152 completed judge reviews and 8 terminally excluded reviews account for all 160 planned reviews\. No judge reviews are pending\./);
  assert.doesNotMatch(html, /generations? (?:are|is) pending|Judging incomplete/);
});

test('settled Magic panels and complete Dungeon Master reports do not invent pending generation work', () => {
  const magic = render({
    caseResults: cells({ scored: 10, unscored: 1, error: 1 }),
    coverage: { responseCount: 11, expectedResponseCount: 12, scoredResponseCount: 10,
      validResponseCount: 11, terminalGenerationFailureCount: 1, terminalJudgmentFailureCount: 4,
      terminallyExcludedJudgmentCount: 4, judgmentCount: 40, expectedJudgmentCount: 48,
      executionComplete: true, executionStatus: 'complete-with-exclusions' }
  }, { isCreation: true, judgeCount: 4 });
  assert.match(magic, /1 terminal generation failures are retained/);
  assert.match(magic, /40 completed answer assessments, 4 failed assessments, and 4 assessments excluded/);
  assert.match(magic, /No judge reviews are pending\. Missing scores remain unassigned\./);
  assert.doesNotMatch(magic, /generations? (?:are|is) pending|failed full-read|Judging incomplete/);

  const dm = render({
    caseResults: cells({ scored: 8 }), cohortSummaries: {}, pairwisePreferences: Array(8).fill({}),
    coverage: { responseCount: 8, expectedResponseCount: 8, scoredResponseCount: 8,
      judgmentCount: 16, expectedJudgmentCount: 16, expectedPairs: 4, executionComplete: true }
  });
  assert.match(dm, /COMPLETE SNAPSHOT/);
  assert.match(dm, /16\/16 planned answer assessments/);
  assert.match(dm, /8\/8 blind pair reviews/);
  assert.doesNotMatch(dm, /generations? (?:are|is) pending|failed generations|Judging incomplete/);
});
