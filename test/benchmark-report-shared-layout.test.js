import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../site/vasirbenchmark.com/benchmark-report.js', import.meta.url), 'utf8');
const declaration = name => {
  const start = source.indexOf(`  const ${name} = `);
  assert.ok(start >= 0, `${name} must be present`);
  const end = source.indexOf('\n  const ', start + 1);
  assert.ok(end > start);
  return source.slice(start, end);
};

test('Writing report sample labels pluralize stories without changing prompt or repetition labels', () => {
  const expression = source.match(/const writingCasePlural = ([^;]+);/)[1];
  for (const [writingCaseLabel, expected] of [['story', 'stories'], ['prompt', 'prompts'], ['repetition', 'repetitions'], ['story case', 'story cases']]) {
    assert.equal(vm.runInNewContext(expression, { writingCaseLabel }), expected);
  }
});

test('all benchmark reports reuse one model comparison before one closed judge and trial disclosure', () => {
  const render = declaration('render');
  assert.match(render, /\$\{heroMarkup\(benchmark, summary\)\}\s*\$\{rankingMarkup\(benchmark\)\}\s*\$\{judgeTrialDetailsMarkup\(benchmark, summary\)\}/);
  assert.equal((render.match(/rankingMarkup\(benchmark\)/g) || []).length, 1);
  assert.equal((render.match(/judgeTrialDetailsMarkup\(benchmark, summary\)/g) || []).length, 1);
  for (const name of ['writingProgressMarkup', 'truthMarkup', 'writingCohortsMarkup', 'creationContextComparisonMarkup', 'overviewMarkup', 'methodMarkup']) assert.ok(!render.includes(`${name}(`), `${name} must not escape the common disclosure`);
  const ranking = declaration('rankingMarkup');
  assert.match(ranking, /<h2 id="ranking-title">Model comparison<\/h2>/);
  assert.equal((ranking.match(/<ol class="model-preview"/g) || []).length, 1);
  assert.match(ranking, /modelPreviewRows\(benchmark\)\.map\(modelRowMarkup\)/);
  assert.match(source, /revealReportTarget\(document\.getElementById\(section\)\)\?\.scrollIntoView/);
  assert.match(source, /revealReportTarget\(promptFile\)\.scrollIntoView/);
});

test('the same disclosure retains optional context, cohort, predecessor and method evidence without altering it', () => {
  const names = ['writingProgressMarkup', 'truthMarkup', 'overviewMarkup', 'writingCohortsMarkup', 'creationContextComparisonMarkup', 'writingPredecessorArchiveMarkup', 'writingPairwiseMarkup', 'writingFlagRatesMarkup', 'methodMarkup'];
  for (const family of ['engineering', 'work-spec', 'core', 'twists', 'magic', 'dungeon-master']) {
    const records = Object.fromEntries(names.map((name, index) => [name, `${family}:${name}:exact-91.23456789:${index}`]));
    const before = JSON.stringify(records);
    const context = Object.fromEntries(names.map(name => [name, () => records[name]]));
    const render = vm.runInNewContext(declaration('judgeTrialDetailsMarkup') + '\njudgeTrialDetailsMarkup', context);
    const html = render({ id: family }, { exactScore: 91.23456789 });
    assert.match(html, /<details class="report-judge-details" data-report-judge-trial-details>/);
    assert.doesNotMatch(html.split('>')[0], /\bopen\b/);
    assert.match(html, /<summary class="work-spec-assessment__summary">Judge &amp; trial details<\/summary>/);
    let previous = -1;
    for (const name of names) {
      const at = html.indexOf(records[name]);
      assert.ok(at > previous, `${family} retains ${name} exactly in the common disclosure`);
      previous = at;
    }
    assert.equal(JSON.stringify(records), before);
  }
});

test('deep links reveal every enclosing native disclosure before scrolling without opening unrelated details', () => {
  const outer = { open: false, parentElement: null };
  const inner = { open: false, parentElement: { closest: selector => { assert.equal(selector, 'details'); return outer; } } };
  const unrelated = { open: false };
  const target = { parentElement: { closest: selector => { assert.equal(selector, 'details'); return inner; } } };
  const reveal = vm.runInNewContext(declaration('revealReportTarget') + '\nrevealReportTarget');
  assert.equal(reveal(target), target);
  assert.equal(inner.open, true);
  assert.equal(outer.open, true);
  assert.equal(unrelated.open, false);
  assert.equal(reveal(null), null);
  const ordinary = { parentElement: { closest: () => null } };
  assert.equal(reveal(ordinary), ordinary);
});

test('all Writing reports hydrate original judge bytes through the same native disclosures', () => {
  const request = { id: 'compact-original', judgeConfigurationId: 'codex:gpt-6-astra@medium',
    promptText: 'Exact <prompt> Ω\nComplete anonymous candidates.', promptSha256: 'p'.repeat(64),
    outputText: '{"reason":"Exact <original> 🦦"}', outputSha256: 'o'.repeat(64) };
  const escapeHTML = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const context = { isWriting: true, creationRequestById: new Map([[request.id, request]]),
    creationSegmentByHash: new Map([['segment', 'Exact segment ']]), creationAnswerByHash: new Map([['answer', 'Quoted Ω answer']]),
    reviewerProfileById: new Map(), copyButtonMarkup: (_text, label) => `<button>${escapeHTML(label)}</button>`, escapeHTML };
  const { markup, promptText, hydrate } = vm.runInNewContext(['creationEvidenceMarkup', 'creationPromptText', 'hydrateCreationEvidence']
    .map(declaration).join('\n') + '\n({markup:creationEvidenceMarkup,promptText:creationPromptText,hydrate:hydrateCreationEvidence})', context);
  assert.match(markup(request.id), /<details .* data-creation-judge-evidence="compact-original">/);
  assert.equal(markup('missing'), '');
  assert.equal(promptText(request), request.promptText);
  assert.equal(promptText({ promptParts: [{ textSha256: 'segment' }, { encoding: 'json-string', outputSha256: 'answer' }] }), 'Exact segment "Quoted Ω answer"');
  assert.equal(promptText({ promptParts: [{ textSha256: 'missing' }] }), null);
  for (const [key, selector, original, bytes] of [
    ['creationJudgeEvidence', '[data-creation-evidence-body]', 'data-creation-original-review', request.outputText],
    ['creationJudgePrompt', '[data-creation-prompt-body]', 'data-creation-original-prompt', request.promptText]
  ]) {
    const body = { dataset: {}, innerHTML: '' }, details = { open: false, dataset: { [key]: request.id }, querySelector: target => target === selector ? body : null };
    hydrate(details); assert.equal(body.innerHTML, '', 'Closed details do not eagerly duplicate large original prompts.');
    details.open = true; hydrate(details);
    assert.ok(body.innerHTML.includes(`${original}><code>${escapeHTML(bytes)}</code>`));
    assert.ok(body.innerHTML.includes(request.judgeConfigurationId));
    assert.equal(body.dataset.hydrated, 'true');
    const before = body.innerHTML; hydrate(details); assert.equal(body.innerHTML, before);
  }
});

test('compact rubric positions retain original task criteria and inherited common rating anchors', () => {
  const rubric = [{ id: 'actual-task-criterion', dimensionId: 'criterion-1', criterion: 'Frozen task wording', weight: 25 }];
  const anchors = { 0: 'Absent', 1: 'Weak', 2: 'Partial', 3: 'Sound', 4: 'Strong', 5: 'Exceptional' };
  const dimensions = vm.runInNewContext(declaration('writingDimensions') + '\nwritingDimensions()', {
    caseById: new Map([['selected', { rubric }]]), activeCaseId: 'selected', data: { methodology: { ratingAnchors: anchors } }, scoreBasis: {}
  });
  assert.equal(dimensions[0].id, 'criterion-1');
  assert.equal(dimensions[0].criterionId, 'actual-task-criterion');
  assert.equal(dimensions[0].label, 'Frozen task wording');
  assert.equal(dimensions[0].description, 'Frozen task wording');
  assert.equal(dimensions[0].anchors, anchors);
  assert.equal(rubric[0].anchors, undefined, 'Rendering does not rewrite original rubric records.');
});

test('compact preferences preserve original candidate order and nested reason without changing old preference shapes', () => {
  const data = { conditions: [{ id: 'baseline', label: 'Plain answer' }, { id: 'skill', label: 'Task-specific skill' }], pairwisePreferences: [
    { caseId: 'selected', reviewerId: 'compact-judge', preferredCondition: 'skill', preference: { reason: 'Original compact reason', confidence: 'high' }, candidateMap: { A: 'skill', B: 'baseline' } },
    { caseId: 'selected', reviewerId: 'old-judge', winner: 'tie', reason: 'Original old reason', confidence: 'low', candidateACondition: 'baseline', candidateBCondition: 'skill' }
  ] };
  const html = vm.runInNewContext(declaration('writingPairwiseMarkup') + '\nwritingPairwiseMarkup()', { data, isWriting: true, activeCaseId: 'selected', escapeHTML: String });
  assert.match(html, /compact-judge · Task-specific skill · high confidence/);
  assert.match(html, /A: Task-specific skill · B: Plain answer/);
  assert.match(html, /data-preference-reason>Original compact reason/);
  assert.match(html, /old-judge · Tie · low confidence/);
  assert.match(html, /A: Plain answer · B: Task-specific skill/);
  assert.doesNotMatch(html, /undefined/);
});

test('shared execution methodology renders every source field with clear labels and preserves null and zero values', () => {
  const execution = { runnerVersion: 'compact-v1', trialCount: 1, hostAutomaticRetries: 0, creatorNetworkRetries: 0,
    creatorOutputLimitRecoveryAttempts: 3, creatorOutputTokenLimitPerSegment: 8192, creatorWholeSessionTokenCap: null,
    deliveryMode: 'frozen-inline-once', futureHTTPPolicy: '<original>' };
  const escapeHTML = value => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const render = vm.runInNewContext(declaration('writingEvidenceFieldsMarkup') + '\n' + declaration('writingExecutionFieldsMarkup') + '\nwritingExecutionFieldsMarkup', { escapeHTML });
  const before = JSON.stringify(execution), html = render(execution);
  for (const [key, value] of Object.entries(execution)) assert.ok(html.includes(`data-method-execution-field="${key}"><code>${value === null ? 'Not reported' : escapeHTML(value)}</code>`));
  assert.match(html, /<dt>Automatic host retries<\/dt>/);
  assert.match(html, /<dt>Creator output-token limit per segment<\/dt>/);
  assert.match(html, /<dt>Creator whole-session token cap<\/dt>/);
  assert.match(html, /<dt>Skill delivery mode<\/dt>/);
  assert.match(html, /<dt>Future HTTP Policy<\/dt>/);
  assert.equal((html.match(/data-method-execution-field=/g) || []).length, Object.keys(execution).length);
  assert.equal(JSON.stringify(execution), before);
  assert.equal(render(null), '');
});
