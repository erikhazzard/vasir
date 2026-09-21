import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { buildSelectedWritingPublication } from '../cli/eval/writing-publication.js';
import { fileURLToPath } from 'node:url';

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

test('common Core report derives included story scores from Astra while preserving every original panel cell', t => {
  const repoRootDirectory = fileURLToPath(new URL('../', import.meta.url));
  const selection = JSON.parse(fs.readFileSync(new URL('../benchmarks/storytelling-core-idea/publication.json', import.meta.url)));
  if (!fs.existsSync(repoRootDirectory + selection.run.path)) return t.skip('Private original Core evidence is not installed.');
  const { projection: data, responseBundle } = buildSelectedWritingPublication({ repoRootDirectory, benchmarkId: 'storytelling-core-idea' });
  const before = JSON.stringify({ data, responseBundle });
  const responseKey = (benchmarkId, settingId, condition, caseId) => [benchmarkId, settingId, condition, caseId].join('|');
  const context = vm.createContext({ data, commonCoreScope: data.provisionalLeaderboard, reportResults: data.caseResults, scoreBasis: data.scoreBasis,
    REQUIRED_CONDITION_IDS: ['baseline', 'skill'], actualTrialNumber: () => 1, responseKey,
    responseByKey: new Map(responseBundle.responses.map(answer => [responseKey(answer.benchmarkId, answer.settingId, answer.condition, answer.caseId), answer])) });
  vm.runInContext(declaration('commonCoreResults') + '\n' + declaration('commonCoreSummary') + '\nglobalThis.cells = commonCoreResults; globalThis.summary = commonCoreSummary;', context);
  assert.equal(context.cells.length, 33 * 11 * 2);
  for (const cell of context.cells) {
    const answer = responseBundle.responses.find(answer => answer.settingId === cell.settingId && answer.caseId === cell.caseId && answer.condition === cell.condition);
    assert.equal(cell.exactScore, answer.judgments.find(judge => judge.judgeConfigurationId === 'codex:gpt-6-astra@xhigh').score);
  }
  assert.equal(context.summary('the-matrix'), null);
  assert.equal(context.summary(data.provisionalLeaderboard.caseIds[0]).usablePairs, 33);
  assert.equal(JSON.stringify({ data, responseBundle }), before);
  assert.match(declaration('modelPreviewRows'), /commonCoreScope\?\.caseIds\.includes\(activeCaseId\) \? commonCoreResults : reportResults/);
  assert.match(declaration('judgingMarkup'), /One Astra xhigh review determines this score/);
  assert.match(declaration('heroMarkup'), /archived story · excluded from aggregate/);
  assert.match(declaration('writingCasePickerMarkup'), /archived, excluded/);
});

test('all benchmark reports reuse one model comparison before one closed judge and trial disclosure', () => {
  const render = declaration('render');
  assert.match(render, /\$\{heroMarkup\(benchmark, summary\)\}\s*\$\{rankingMarkup\(benchmark\)\}\s*\$\{judgeTrialDetailsMarkup\(benchmark, summary\)\}/);
  assert.equal((render.match(/rankingMarkup\(benchmark\)/g) || []).length, 1);
  assert.equal((render.match(/judgeTrialDetailsMarkup\(benchmark, summary\)/g) || []).length, 1);
  for (const name of ['writingProgressMarkup', 'truthMarkup', 'writingCohortsMarkup', 'creationContextComparisonMarkup', 'overviewMarkup', 'methodMarkup']) assert.ok(!render.includes(`${name}(`), `${name} must not escape the common disclosure`);
  const ranking = declaration('rankingMarkup');
  assert.match(ranking, /\$\{headToHeadMarkup\(benchmark\)\}/);
  assert.match(ranking, /<h2 id="ranking-title">Model comparison<\/h2>/);
  assert.equal((ranking.match(/<ol class="model-preview"/g) || []).length, 1);
  assert.match(ranking, /modelPreviewRows\(benchmark\)\.map\(modelRowMarkup\)/);
  assert.match(source, /revealReportTarget\(document\.getElementById\(section\)\)\?\.scrollIntoView/);
  assert.match(source, /revealReportTarget\(promptFile\)\.scrollIntoView/);
});

test('Magic displays the existing three-trial aggregate regardless of a legacy trial link', () => {
  const data = { settings: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }], benchmarkResults: [
    { benchmarkId: 'magic', settingId: 'one', condition: 'baseline', score: 60, exactScore: 60 },
    { benchmarkId: 'magic', settingId: 'one', condition: 'skill', score: 90, exactScore: 90 },
    { benchmarkId: 'magic', settingId: 'two', condition: 'baseline', score: 70, exactScore: 70 },
    { benchmarkId: 'magic', settingId: 'two', condition: 'skill', score: 80, exactScore: 80 }
  ] };
  const reportResults = [1, 2, 3].flatMap(trialNumber => data.benchmarkResults.map(cell => ({ ...cell, caseId: 'prompt', trialNumber,
    score: cell.score + (trialNumber - 2) * 10, exactScore: cell.exactScore + (trialNumber - 2) * 10 })));
  const context = vm.createContext({ data, reportResults, isCreation: true, isWriting: true, isWorkSpec: false,
    commonCoreScope: null, activeCaseId: 'prompt', activeTrialNumber: 1, actualTrialNumber: cell => cell.trialNumber,
    settingById: new Map(data.settings.map(setting => [setting.id, setting])), responseByKey: new Map(), responseKey: () => '' });
  vm.runInContext(declaration('modelPreviewRows') + '\n' + declaration('creationAggregateSummary') + '\nglobalThis.rows=modelPreviewRows;globalThis.summary=creationAggregateSummary;', context);
  for (const trial of [1, 2, 3]) {
    context.activeTrialNumber = trial;
    assert.equal(JSON.stringify(context.rows({ id: 'magic' }).map(row => [row.setting.id, row.baseline, row.treatment, row.delta, row.rank])), JSON.stringify([['one', 60, 90, 30, 1], ['two', 70, 80, 10, 2]]));
    assert.equal(JSON.stringify(context.summary({ id: 'magic' })), JSON.stringify({ baseline: 65, treatment: 85, delta: 20, wins: 2, ties: 0, losses: 0 }));
  }
  assert.match(declaration('writingCasePickerMarkup'), /if \(!isWriting \|\| isCreation\) return ''/);
  assert.match(declaration('render'), /isCreation \? creationAggregateSummary\(benchmark\)/);
  assert.match(declaration('modelRowMarkup'), /isCreation \? trialComparisonsMarkup\(row, index\)/);
  assert.doesNotMatch(declaration('rankingMarkup'), /Values and transcripts below describe the selected trial/);
});

test('Writing shows only useful prompt and trial selectors', () => {
  const data = { cases: [{ benchmarkId: 'writing', id: 'one', title: 'Only prompt' }] };
  const context = vm.createContext({ data, isWriting: true, isCreation: false, hasWritingTrialPicker: false,
    activeCaseId: 'one', activeTrialNumber: 1, writingTrialCount: 3, writingCaseLabel: 'prompt',
    writingCasePlural: 'prompts', commonCoreScope: null, SETTING_COUNT: 33, escapeHTML: String });
  vm.runInContext(declaration('writingCasePickerMarkup') + '\nglobalThis.picker=writingCasePickerMarkup;', context);
  const benchmark = { id: 'writing', name: 'Plot twists' };
  assert.equal(context.picker(benchmark), '', 'A single prompt needs neither a selector nor its instruction row.');
  data.cases.push({ benchmarkId: 'unrelated', id: 'elsewhere', title: 'Other benchmark' });
  assert.equal(context.picker(benchmark), '', 'Only the current benchmark contributes choices.');
  context.hasWritingTrialPicker = true;
  assert.doesNotMatch(context.picker(benchmark), /data-writing-case|Choose a prompt/);
  assert.match(context.picker(benchmark), /data-writing-trial/);
  assert.match(context.picker(benchmark), /Choose a trial to inspect/);
  data.cases.push({ benchmarkId: 'writing', id: 'two', title: 'Another prompt' });
  assert.match(context.picker(benchmark), /data-writing-case/);
  assert.match(context.picker(benchmark), /Choose a prompt and trial/);
  context.hasWritingTrialPicker = false;
  assert.match(context.picker(benchmark), /data-writing-case/);
  assert.doesNotMatch(context.picker(benchmark), /data-writing-trial/);
  context.isCreation = true;
  assert.equal(context.picker(benchmark), '');
  context.isCreation = false;
  context.isWriting = false;
  assert.equal(context.picker(benchmark), '');
  assert.match(declaration('render'), /\$\{writingCasePickerMarkup\(benchmark\)\}/);
});

test('Magic keeps every original trial inside model details with its own scores and unique heading IDs', () => {
  const responseKey = (benchmark, setting, condition, story, trial) => `${setting}/${condition}/${trial}`;
  const responseByKey = new Map(), benchmarkResultByKey = new Map();
  for (const trial of [1, 2, 3]) for (const condition of ['baseline', 'skill']) {
    const key = responseKey('magic', 'one', condition, 'prompt', trial);
    responseByKey.set(key, { outputText: `Original ${condition} ${trial}` }); benchmarkResultByKey.set(key, { score: 70 + trial });
  }
  const contexts = [];
  const render = vm.runInNewContext(declaration('trialComparisonsMarkup') + '\ntrialComparisonsMarkup', {
    writingTrialCount: 3, activeBenchmarkId: 'magic', activeCaseId: 'prompt', responseKey, responseByKey, benchmarkResultByKey,
    BASELINE_SHORT: 'Plain', formatScore: String, escapeHTML: String,
    conditionTranscriptMarkup: value => { contexts.push(value); return value.response.outputText; }
  });
  const html = render({ setting: { id: 'one', label: 'One' } }, 7);
  assert.equal((html.match(/data-report-trial=/g) || []).length, 3);
  assert.equal(contexts.length, 6);
  for (const trial of [1, 2, 3]) for (const condition of ['baseline', 'skill']) {
    assert.ok(html.includes(`Original ${condition} ${trial}`));
    assert.ok(contexts.some(context => context.rowIndex === `7-trial-${trial}` && context.condition === condition && context.score === 70 + trial));
  }
  assert.doesNotMatch(html, /<select|<details[^>]*\bopen\b/);
});

test('shared head-to-head makes every judge preference visible and retains readable non-JSON reviews', () => {
  const candidates = [
    { id: 'first', label: 'Model One · max', settingId: 'one', title: 'Story <one>', wordCount: 12 },
    { id: 'second', label: 'Model Two · high', settingId: 'two', title: 'Story two', wordCount: 14 }
  ];
  const reviews = ['judge-one', 'judge-two'].flatMap(judgeId => candidates.map((candidate, index) => ({
    id: `${judgeId}-${index}`, judgeId, firstCandidateId: candidate.id, preferredCandidateId: 'first',
    reason: 'Exact reason <not HTML>', rawText: 'Original malformed {text', confidence: 'medium',
    interpretation: judgeId === 'judge-two' && index === 1 ? 'explicit-text-transcription' : 'structured-preference'
  })));
  const comparison = { id: 'pair', benchmarkId: 'writing', caseId: 'selected', condition: 'skill', candidates, reviews,
    judges: ['judge-one', 'judge-two'].map(id => ({ id, label: id, orderConsistent: true })) };
  const responseData = { headToHeads: [comparison] }, before = JSON.stringify(responseData);
  const escapeHTML = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const context = { responseData, isWriting: true, activeCaseId: 'selected', escapeHTML,
    responseKey: (_benchmarkId, settingId) => settingId,
    responseByKey: new Map([['one', { outputText: 'Actual <first> answer' }], ['two', { outputText: 'Actual second answer' }]]) };
  const render = vm.runInNewContext(declaration('headToHeadMarkup') + '\nheadToHeadMarkup', context);
  const html = render({ id: 'writing' });
  assert.match(html, /Which story did the judges prefer\?/);
  assert.equal((html.match(/data-head-to-head-judge=/g) || []).length, 2);
  assert.equal((html.match(/data-head-to-head-preference="first"/g) || []).length, 4);
  assert.equal((html.match(/Same choice in both orders/g) || []).length, 2);
  assert.match(html, /Exact reason &lt;not HTML&gt;/);
  assert.match(html, /Actual &lt;first&gt; answer/);
  assert.match(html, /Preference and reason transcribed from the judge’s explicit answer/);
  assert.match(html, /Original malformed \{text/);
  assert.doesNotMatch(html.split('<details')[0], /malformed|invalid|JSON/);
  assert.equal(JSON.stringify(responseData), before, 'Display interpretation must not alter original evidence.');
  assert.equal(render({ id: 'different-benchmark' }), '');
  responseData.headToHeads = [{ ...comparison, caseId: 'different-case' }];
  assert.equal(render({ id: 'writing' }), '');
  responseData.headToHeads = [{ ...comparison, judges: [{ id: 'judge-one', label: 'Judge One', orderConsistent: false }],
    reviews: [{ ...reviews[0], preferredCandidateId: 'tie' }, { ...reviews[1], preferredCandidateId: 'second' }] }];
  const split = render({ id: 'writing' });
  assert.match(split, /No consistent choice across orders/);
  assert.match(split, /data-head-to-head-preference="tie"><strong>Tie/);
  assert.match(split, /data-head-to-head-preference="second"><strong>Model Two/);
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
