#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveExpectedOverallV3, deriveExpectedWritingCategory, deriveExpectedOverallAvailableCategories, verifyOverallV3Projection } from '../../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';

// Audit the original same-release Writing publication without loading it in the
// page. Overall's production startup remains independent of the large archive.
async function loadOverallV3Oracle(evaluate) {
  const context = await evaluate('({root:window.VASIR_DATA,appUrl:[...document.scripts].map(script=>script.src).find(src=>new URL(src).pathname.endsWith("/app.js")),writingLoaded:!!window.VASIR_WRITING,answersLoaded:!!window.VASIR_WRITING_RESPONSES||!!window.VASIR_WRITING_CREATION_RESPONSES})');
  if (context.root?.overall?.scoreBasis?.edition !== 'overall-v3') return null;
  if (!context.appUrl || context.writingLoaded || context.answersLoaded) throw new Error('Overall v3 must start with a pinned app and without Writing data or answer archives.');
  const sourceUrl = new URL('writing-data.js', context.appUrl);
  let bytes;
  if (sourceUrl.protocol === 'file:') bytes = fs.readFileSync(fileURLToPath(sourceUrl));
  else {
    const response = await fetch(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Cannot audit same-release Writing source: ' + response.status);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  const sandbox = { window: {} };
  vm.runInNewContext(bytes.toString('utf8'), sandbox, { filename: sourceUrl.href, timeout: 10000 });
  const writing = sandbox.window.VASIR_WRITING_COLLECTION || sandbox.window.VASIR_WRITING;
  if (!writing) throw new Error('Same-release Writing source has no collection.');
  const oracle = deriveExpectedOverallV3({ engineering: context.root, aiWorkflows: context.root.aiWorkflows, writing });
  verifyOverallV3Projection(context.root.overall, oracle);
  const sourceProjection = deriveExpectedWritingCategory(writing, 'all-writing');
  const overallWritingPublications = [...sourceProjection.publications].filter(([benchmarkId]) => oracle.benchmarkIds.includes(benchmarkId));
  const writingSummaries = overallWritingPublications.map(([benchmarkId, publication]) => {
    const official = publication.benchmarkSummaries[0], provisional = publication.provisionalLeaderboard;
    const usesProvisional = sourceProjection.sources.get(benchmarkId)?.provisional === true && provisional?.status === 'provisional' && !!provisional.rankedSettingCount;
    return { ...official, ...(usesProvisional ? provisional.summary : {}), benchmarkId };
  });
  const benchmarkDisplays = Object.fromEntries(overallWritingPublications.map(([benchmarkId, publication]) => {
    const basis = sourceProjection.sources.get(benchmarkId);
    return [benchmarkId, { settingCount: basis.completedSettingCount, caseCount: basis.provisional ? publication.provisionalLeaderboard.expectedCaseCount : publication.cases.length,
      trials: publication.trialCount || publication.scoreBasis.trialsPerTask || 1, judgeCount: basis.judgeCount, provisional: basis.provisional }];
  }));
  return { ...oracle, availableCategoriesBySetting: Object.fromEntries(oracle.coverage.records.map(record => [record.id, deriveExpectedOverallAvailableCategories(oracle, record.configurationId)])), benchmarkSummaries: [...context.root.benchmarkSummaries, ...writingSummaries, ...context.root.aiWorkflows.benchmarkSummaries],
    benchmarks: [...context.root.benchmarks, ...overallWritingPublications.flatMap(([, publication]) => publication.benchmarks), ...context.root.aiWorkflows.benchmarks], benchmarkDisplays,
    writingCatalog: writing.writingScoreBasis ? { scoreBasis: writing.writingScoreBasis,
      benchmarkIds: [...sourceProjection.publications.keys()], currentBenchmarkIds: sourceProjection.listedBenchmarkIds,
      archivedBenchmarkIds: [...sourceProjection.publications.keys()].filter(id => !sourceProjection.listedBenchmarkIds.includes(id)) } : null,
    originalWritingSource: { url: sourceUrl.href, sha256: createHash('sha256').update(bytes).digest('hex'), loadedOnlyByAudit: true },
    sourceScoreVerified: true, lazyBeforeWriting: true, answersLazy: true };
}

const [pageInput, destinationInput, widthInput, heightInput, requestedTarget = 'leaderboard'] = process.argv.slice(2);
const width = Number(widthInput);
const height = Number(heightInput);
const captureTarget = requestedTarget.toLowerCase();
const isWorkflowCapture = captureTarget.startsWith('workflow');
const isGamesCapture = ['games', 'game-benchmarks', 'game-efficiency'].includes(captureTarget);
const isOverallTarget = ['leaderboard', 'efficiency', 'overall-coverage', 'overall-method'].includes(captureTarget);
const isReportCapture = captureTarget === 'report' || captureTarget === 'workflow-report' || captureTarget === 'workflow-inspector';
const captureTargets = new Set([
  'leaderboard',
  'overall-coverage',
  'overall-method',
  'capabilities',
  'capability-benchmarks',
  'efficiency',
  'report',
  'workflows',
  'workflow-benchmarks',
  'workflow-efficiency',
  'workflow-report',
  'workflow-inspector',
  'games',
  'game-benchmarks',
  'game-efficiency'
]);
const targetRoutes = {
  games: 'capabilities/games',
  'game-benchmarks': 'capabilities/games/benchmarks',
  'game-efficiency': 'capabilities/games/efficiency',
  leaderboard: 'capabilities/overall',
  'overall-coverage': 'capabilities/overall',
  'overall-method': 'capabilities/overall',
  capabilities: 'capabilities/engineering',
  'capability-benchmarks': 'capabilities/engineering/benchmarks',
  efficiency: 'capabilities/overall/efficiency',
  report: 'hyper-scale-chat',
  workflows: 'capabilities/ai-workflows',
  'workflow-benchmarks': 'capabilities/ai-workflows/benchmarks',
  'workflow-efficiency': 'capabilities/ai-workflows/efficiency',
  'workflow-report': 'work-spec-chat',
  'workflow-inspector': 'work-spec-chat'
};
const EXPECTED_SETTING_COUNT = 36;
const EXPECTED_CONDITION_COUNT = 2;
const EXPECTED_BENCHMARK_COUNT = 3;
const NAVIGATION_LOAD_TIMEOUT_MS = 30_000;
const EXPECTED_PUBLIC_COUNTS = Object.freeze({
  benchmarks: EXPECTED_BENCHMARK_COUNT,
  conditions: EXPECTED_CONDITION_COUNT,
  settings: EXPECTED_SETTING_COUNT,
  entries: EXPECTED_SETTING_COUNT * EXPECTED_CONDITION_COUNT,
  responses: EXPECTED_SETTING_COUNT * EXPECTED_CONDITION_COUNT * EXPECTED_BENCHMARK_COUNT
});
const EXPECTED_FABLE_5_1_CONFIGURATION_IDS = Object.freeze([
  'claude:claude-fable-5-1@xhigh',
  'claude:claude-fable-5-1@max',
  'claude:claude-fable-5-1@ultracode'
]);
const EXPECTED_ASTRA_CONFIGURATION_IDS = Object.freeze([
  'codex:gpt-6-astra@low',
  'codex:gpt-6-astra@medium',
  'codex:gpt-6-astra@high',
  'codex:gpt-6-astra@xhigh',
  'codex:gpt-6-astra@max',
  'codex:gpt-6-astra@ultra'
]);
const EXPECTED_CLAUDE_MODEL_LABELS = Object.freeze({
  'claude:fable': 'Claude Fable 5',
  'claude:claude-fable-5-1': 'Claude Fable 5.1',
  'claude:opus': 'Claude Opus 5'
});
const EXPECTED_CLAUDE_SETTING_COUNT = 13;

if (
  !pageInput
  || !destinationInput
  || !Number.isInteger(width)
  || !Number.isInteger(height)
  || width <= 0
  || height <= 0
  || !captureTargets.has(captureTarget)
) {
  console.error('Usage: capture.mjs PAGE DESTINATION WIDTH HEIGHT [leaderboard|overall-coverage|overall-method|capabilities|capability-benchmarks|efficiency|report|workflows|workflow-benchmarks|workflow-efficiency|workflow-report|workflow-inspector|games|game-benchmarks|game-efficiency]');
  console.error('PAGE must be a local file path or an HTTPS URL.');
  process.exit(1);
}

const pageUrl = (() => {
  if (/^https?:\/\//i.test(pageInput)) {
    try {
      const url = new URL(pageInput);
      if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
        throw new Error('remote captures require HTTPS');
      }
      return url;
    } catch (error) {
      console.error('Invalid page URL: ' + pageInput + ' (' + error.message + ')');
      process.exit(1);
    }
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(pageInput)) {
    console.error('Unsupported page URL protocol: ' + pageInput);
    process.exit(1);
  }
  if (!fs.existsSync(pageInput)) {
    console.error('Page not found: ' + pageInput);
    process.exit(1);
  }
  return pathToFileURL(path.resolve(pageInput));
})();
pageUrl.hash = targetRoutes[captureTarget];

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const chromeBinary = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chromeBinary) {
  console.error('Chrome not found. Set CHROME_BIN to a Chromium-compatible executable.');
  process.exit(1);
}

const destination = path.resolve(destinationInput);
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vasirbench-capture.'));
const portFile = path.join(profileDirectory, 'DevToolsActivePort');
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const chrome = spawn(chromeBinary, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-sync',
  '--no-first-run',
  '--no-default-browser-check',
  '--allow-file-access-from-files',
  '--remote-debugging-port=0',
  '--user-data-dir=' + profileDirectory,
  '--window-size=' + width + ',' + height,
  'about:blank'
], { stdio: 'ignore' });

async function waitFor(check, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await check();
    if (value) return value;
    await delay(50);
  }
  throw new Error('Timed out after ' + timeout + 'ms');
}

function createProtocol(socket) {
  let nextId = 1;
  const pending = new Map();
  const waiters = new Map();
  const listeners = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }

    const methodWaiters = waiters.get(message.method) || [];
    if (methodWaiters.length) {
      waiters.delete(message.method);
      methodWaiters.forEach((resolve) => resolve(message.params));
    }
    (listeners.get(message.method) || []).forEach((listener) => listener(message.params));
  });

  const send = (method, params = {}, timeout = 15_000) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Timed out calling ' + method + ' after ' + timeout + 'ms'));
    }, timeout);
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      }
    });
    try {
      socket.send(JSON.stringify({ id, method, params }));
    } catch (error) {
      clearTimeout(timer);
      pending.delete(id);
      reject(error);
    }
  });

  const once = (method, timeout = 15_000) => new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      const remaining = (waiters.get(method) || []).filter(waiter => waiter !== receive);
      if (remaining.length) waiters.set(method, remaining);
      else waiters.delete(method);
    };
    const receive = params => { cleanup(); resolve(params); };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for ' + method));
    }, timeout);
    const methodWaiters = waiters.get(method) || [];
    methodWaiters.push(receive);
    waiters.set(method, methodWaiters);
  });

  const on = (method, listener) => {
    const methodListeners = listeners.get(method) || [];
    methodListeners.push(listener);
    listeners.set(method, methodListeners);
  };

  return { send, once, on };
}

async function connect(port) {
  const targets = await waitFor(async () => {
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/json/list');
      const result = await response.json();
      return result.length ? result : null;
    } catch {
      return null;
    }
  });
  const target = targets.find((candidate) => candidate.type === 'page') || targets[0];
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return socket;
}

function readManifest() {
  const data = window.VASIR_DATA;
  if (!data) return null;
  const responses = window.VASIR_RESPONSES;
  return {
    kind: data.kind,
    schemaVersion: data.schemaVersion,
    scoreEdition: data.scoreBasis?.edition,
    scoreMethod: data.scoreBasis?.method,
    conditions: (data.conditions || []).map((condition) => condition.id),
    categories: (data.categories || []).map((category) => category.id),
    benchmarks: (data.benchmarks || []).map((benchmark) => benchmark.id),
    configurationIds: (data.settings || []).map((setting) => setting.configurationId),
    settingCount: data.settings?.length,
    entryCount: data.entries?.length,
    resultCount: data.benchmarkResults?.length,
    responseKind: responses?.kind || null,
    responseSchemaVersion: responses?.schemaVersion || null,
    responseMessageSetCount: responses?.messageSets?.length || 0,
    responseCount: responses?.responses?.length || 0,
    judgmentCount: responses?.responses?.reduce(
      (total, response) => total + (Array.isArray(response.judgments) ? response.judgments.length : 0),
      0
    ) || 0
  };
}

async function auditSite(
  target,
  viewportWidth,
  expectedCounts,
  expectedFableConfigurationIds,
  expectedAstraConfigurationIds,
  expectedClaudeModelLabels,
  expectedClaudeSettingCount
) {
  const data = window.VASIR_DATA;
  const responseBundle = target === 'report' ? window.VASIR_RESPONSES : null;
  const failures = [];
  const expectedBenchmarkIds = ['hyper-scale-chat', 'personalized-home-feed', 'device-telemetry'];
  const expectedConditionIds = ['baseline', 'skill'];
  const expectedFableLabel = expectedClaudeModelLabels['claude:claude-fable-5-1'];
  const expectedClaudeLabels = Object.values(expectedClaudeModelLabels);
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const text = (element) => element?.textContent.replace(/\s+/g, ' ').trim() || '';
  const number = (value) => {
    const match = String(value ?? '')
      .replaceAll(',', '')
      .replaceAll('−', '-')
      .match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : Number.NaN;
  };
  const close = (actual, expected, tolerance = 0.06) => (
    Number.isFinite(actual)
    && Number.isFinite(expected)
    && Math.abs(actual - expected) <= tolerance
  );
  const isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return (
      style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity) > 0
      && box.width > 0
      && box.height > 0
    );
  };
  const routeTo = async (fragment) => {
    const expected = '#' + fragment;
    if (location.hash !== expected) location.hash = fragment;
    await settle();
    return location.hash;
  };
  const scoreFor = (entry, field = 'overall') => {
    if (!entry) return Number.NaN;
    if (field === 'overall') return Number(entry.score);
    return Number(entry.categories?.find((reading) => reading.category === field)?.score);
  };
  const sortedCondition = (condition, field = 'overall') => (data.entries || [])
    .filter((entry) => entry.condition === condition)
    .sort((left, right) => (
      scoreFor(right, field) - scoreFor(left, field)
      || Number(right.score) - Number(left.score)
      || Number(left.latency) - Number(right.latency)
      || left.id.localeCompare(right.id)
    ));
  const ranksFor = (condition, field = 'overall') => new Map(
    sortedCondition(condition, field).map((entry, index) => [entry.id, index + 1])
  );
  const baselineBySetting = new Map(
    (data.entries || [])
      .filter((entry) => entry.condition === 'baseline')
      .map((entry) => [entry.settingId, entry])
  );
  const entryById = new Map((data.entries || []).map((entry) => [entry.id, entry]));
  const settingById = new Map((data.settings || []).map((setting) => [setting.id, setting]));
  const settingByConfigurationId = new Map(
    (data.settings || []).map((setting) => [setting.configurationId, setting])
  );
  const summaryById = new Map((data.benchmarkSummaries || []).map((summary) => [summary.benchmarkId, summary]));
  const canonicalJudgeConfigurationIds = Array.isArray(data.scoreBasis?.judges)
    ? data.scoreBasis.judges
    : [];
  const judgmentKeys = [
    'failedGates',
    'gateCap',
    'judgeConfigurationId',
    'rationale',
    'rawScore',
    'score'
  ].sort();
  const hasExactKeys = (value, expectedKeys) => (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).sort().join('|') === expectedKeys.join('|')
  );
  const humanizeGateId = (value) => String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part, index) => (
      index === 0
        ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        : part.toLowerCase()
    ))
    .join(' ');

  const transcriptKey = (benchmarkId, settingId, condition, trialNumber = 1) => (
    [benchmarkId, settingId, condition, trialNumber].join('|')
  );

  const indexResponseBundle = (context) => {
    const messageSetById = new Map();
    const responseByKey = new Map();
    if (
      canonicalJudgeConfigurationIds.length !== 2
      || new Set(canonicalJudgeConfigurationIds).size !== 2
      || canonicalJudgeConfigurationIds.some((configurationId) => (
        !settingByConfigurationId.has(configurationId)
      ))
    ) {
      failures.push(context + ': canonical two-judge panel is invalid');
    }
    if (
      !responseBundle
      || typeof responseBundle !== 'object'
      || responseBundle.kind !== 'vasirbenchmark-public-responses'
      || ![2, 3].includes(responseBundle.schemaVersion)
      || !Array.isArray(responseBundle.messageSets)
      || !Array.isArray(responseBundle.responses)
    ) {
      failures.push(context + ': response bundle does not match the public transcript schema');
      return { messageSetById, responseByKey };
    }

    responseBundle.messageSets.forEach((messageSet, index) => {
      if (
        !messageSet
        || typeof messageSet.id !== 'string'
        || !messageSet.id
        || !Array.isArray(messageSet.messages)
        || !messageSet.messages.length
      ) {
        failures.push(context + ': invalid message set at index ' + index);
        return;
      }
      if (messageSetById.has(messageSet.id)) {
        failures.push(context + ': duplicate message set ' + messageSet.id);
        return;
      }
      messageSet.messages.forEach((message, messageIndex) => {
        if (
          !message
          || typeof message.role !== 'string'
          || !message.role
          || typeof message.content !== 'string'
        ) {
          failures.push(
            context + ': invalid message ' + (messageIndex + 1) + ' in message set ' + messageSet.id
          );
        }
      });
      messageSetById.set(messageSet.id, messageSet);
    });

    if (responseBundle.responses.length !== expectedCounts.responses) {
      failures.push(
        context
        + ': response count '
        + responseBundle.responses.length
        + '/'
        + expectedCounts.responses
      );
    }
    responseBundle.responses.forEach((response, index) => {
      if (
        !response
        || typeof response.benchmarkId !== 'string'
        || typeof response.settingId !== 'string'
        || typeof response.configurationId !== 'string'
        || !expectedConditionIds.includes(response.condition)
        || response.trialNumber !== 1
        || typeof response.messageSetId !== 'string'
        || typeof response.outputText !== 'string'
        || !response.outputText
        || !Array.isArray(response.judgments)
      ) {
        failures.push(context + ': invalid response at index ' + index);
        return;
      }
      const setting = settingById.get(response.settingId);
      if (!expectedBenchmarkIds.includes(response.benchmarkId)) {
        failures.push(context + ': unknown benchmark on response ' + index);
      }
      if (!setting) {
        failures.push(context + ': unknown setting on response ' + index);
      } else if (setting.configurationId !== response.configurationId) {
        failures.push(context + ': configuration mismatch on response ' + index);
      }
      if (!messageSetById.has(response.messageSetId)) {
        failures.push(context + ': missing message set ' + response.messageSetId + ' on response ' + index);
      }
      if (response.judgments.length !== 2) {
        failures.push(
          context + ': judgment count ' + response.judgments.length + '/2 on response ' + index
        );
      }
      response.judgments.forEach((judgment, judgmentIndex) => {
        const judgmentContext = context
          + ': judgment '
          + (judgmentIndex + 1)
          + ' on response '
          + index;
        if (!hasExactKeys(judgment, judgmentKeys)) {
          failures.push(judgmentContext + ' does not have the exact public fields');
          return;
        }
        if (judgment.judgeConfigurationId !== canonicalJudgeConfigurationIds[judgmentIndex]) {
          failures.push(judgmentContext + ' is not in canonical panel order');
        }
        if (!settingByConfigurationId.has(judgment.judgeConfigurationId)) {
          failures.push(judgmentContext + ' has no canonical setting label');
        }
        if (
          !Number.isFinite(judgment.score)
          || !Number.isFinite(judgment.rawScore)
          || !Number.isFinite(judgment.gateCap)
        ) {
          failures.push(judgmentContext + ' has invalid score mechanics');
        }
        if (
          !Array.isArray(judgment.failedGates)
          || judgment.failedGates.some((gate) => typeof gate !== 'string' || !gate)
        ) {
          failures.push(judgmentContext + ' has invalid failed gates');
        }
        if (typeof judgment.rationale !== 'string' || !judgment.rationale) {
          failures.push(judgmentContext + ' has no rationale');
        }
      });
      const key = transcriptKey(
        response.benchmarkId,
        response.settingId,
        response.condition,
        response.trialNumber
      );
      if (responseByKey.has(key)) {
        failures.push(context + ': duplicate response ' + key);
        return;
      }
      responseByKey.set(key, response);
    });

    return { messageSetById, responseByKey };
  };

  const transcriptIndex = target === 'report'
    ? indexResponseBundle('Report transcripts')
    : { messageSetById: new Map(), responseByKey: new Map() };

  const auditClaudeIdentityFit = (context, selector, expectedCount = null) => {
    const identities = [...document.querySelectorAll(selector)]
      .filter(isVisible)
      .filter((element) => expectedClaudeLabels.some((label) => text(element).includes(label)));
    if (expectedCount != null && identities.length !== expectedCount) {
      failures.push(context + ': visible versioned Claude identity count ' + identities.length + '/' + expectedCount);
    }
    identities.forEach((identity, index) => {
      if (identity.scrollWidth > identity.clientWidth) {
        failures.push(
          context
          + ': versioned Claude identity '
          + (index + 1)
          + ' is horizontally truncated ('
          + identity.scrollWidth
          + 'px scroll / '
          + identity.clientWidth
          + 'px client)'
        );
      }
    });
  };

  const auditRenderedClaudeIdentities = (context) => {
    auditClaudeIdentityFit(context, [
      '.capability-canvas__reading dd > small',
      '.setting-row__model > strong',
      '.capability-rank-row__model > strong',
      '.efficiency-plane__annotation > strong',
      '.selected-result-heading h4',
      '.efficiency-summary__alternative-identity > strong',
      '.frontier-row__identity > strong',
      '.model-preview__identity > strong'
    ].join(','));
  };

  const requireTruth = (context, selector) => {
    const element = document.querySelector(selector);
    const value = text(element);
    if (!isVisible(element)) failures.push(context + ': truth status is not visible');
    const taskCount = Number(data.scoreBasis?.taskCount || data.benchmarks?.length || 0);
    const trialCount = Number(data.scoreBasis?.trialsPerTask || data.meta?.trials || 0);
    const scoreLabel = String(data.scoreBasis?.label || 'Engineering v2');
    const judgeCount = Number(data.scoreBasis?.judgeCount || 2);
    const disclosure = scoreLabel + ' · '
      + taskCount + ' ' + (taskCount === 1 ? 'task' : 'tasks')
      + ' × ' + trialCount + ' ' + (trialCount === 1 ? 'trial' : 'trials')
      + ' · ' + judgeCount + ' judges';
    if (!value.includes(disclosure)) failures.push(context + ': compact development disclosure mismatch');
  };

  const auditVisibleLanguage = (context) => {
    const bodyText = text(document.body);
    const primaryText = text(document.querySelector('.capability-browser, .report-shell'));
    const measuredText = text(document.querySelector('.capability-browser__canvas, .report-shell'));
    const retired = bodyText.match(/\b(?:illustrative|mock|fixture|fake data)\b/i);
    if (retired) failures.push(context + ': retired data language "' + retired[0] + '"');
    const retiredCondition = bodyText.match(/\b(?:with vasir|without vasir|full vasir)\b/i);
    if (retiredCondition) failures.push(context + ': retired condition label "' + retiredCondition[0] + '"');
    const retiredScope = bodyText.match(/\b(?:24 benchmarks|20 model settings|4,320 runs)\b/i)
      || measuredText.match(/\b5 categories\b/i);
    if (retiredScope) failures.push(context + ': retired scope "' + retiredScope[0] + '"');
    const retiredScore = bodyText.match(/\b(?:peer index|peer score|outcome elo)\b/i);
    if (retiredScore) failures.push(context + ': retired score language "' + retiredScore[0] + '"');
    const retiredEvidenceBureaucracy = primaryText.match(/\b(?:panel audit required|public evidence boundary|evidence state|calibration pending|unverified)\b/i);
    if (retiredEvidenceBureaucracy) {
      failures.push(context + ': retired evidence bureaucracy "' + retiredEvidenceBureaucracy[0] + '"');
    }
    const exposedEditionId = primaryText.match(/backend-architecture-[a-z0-9-]+:[a-f0-9]{64}/i);
    if (exposedEditionId) failures.push(context + ': internal score-basis id is visible');
    // Keep the Engineering-v1 publication guard scoped to its own result surface.
    // Standalone pilots may be linked elsewhere on the page without becoming
    // published categories in this report.
    const futureCategory = measuredText.match(data.aiWorkflows ? /\b(?:Product Design|Games)\b/ : /\b(?:AI Workflows|Product Design|Games)\b/);
    if (futureCategory) failures.push(context + ': unpublished category "' + futureCategory[0] + '"');
  };

  const auditDocument = (context) => {
    const idCounts = new Map();
    document.querySelectorAll('[id]').forEach((element) => {
      idCounts.set(element.id, (idCounts.get(element.id) || 0) + 1);
    });
    const duplicateIds = [...idCounts].filter(([, count]) => count > 1).map(([id]) => id);
    if (duplicateIds.length) failures.push(context + ': duplicate ids ' + duplicateIds.slice(0, 8).join(', '));

    const accessibleName = (element) => {
      const aria = element.getAttribute('aria-label')?.trim();
      if (aria) return aria;
      const labelled = (element.getAttribute('aria-labelledby') || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => text(document.getElementById(id)))
        .join(' ')
        .trim();
      if (labelled) return labelled;
      if (element.labels?.length) return [...element.labels].map(text).join(' ').trim();
      return text(element);
    };
    [...document.querySelectorAll('button, a[href], select, summary')]
      .filter(isVisible)
      .forEach((element) => {
        if (!accessibleName(element)) failures.push(context + ': unnamed ' + element.tagName.toLowerCase());
      });
    [...document.querySelectorAll('a[href]')]
      .filter(isVisible)
      .forEach((link) => {
        const href = link.getAttribute('href')?.trim() || '';
        if (!href || href === '#' || /^javascript:/i.test(href)) {
          failures.push(context + ': invalid link ' + (href || '(empty)'));
        }
      });

    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    if (scrollWidth > innerWidth + 1) {
      failures.push(context + ': horizontal overflow ' + scrollWidth + 'px in ' + innerWidth + 'px viewport');
    }
    const frame = document.querySelector('.page-frame');
    const frameBox = frame?.getBoundingClientRect();
    if (!frameBox || Math.abs(frameBox.left) > 1 || Math.abs(frameBox.width - innerWidth) > 2) {
      failures.push(context + ': page is not full bleed');
    }
    auditRenderedClaudeIdentities(context);
    auditVisibleLanguage(context);
  };

  if (!data || typeof data !== 'object') {
    return { failures: ['public projection is missing'] };
  }

  const arrays = [
    ['conditions', expectedCounts.conditions],
    ['categories', 1],
    ['families', 1],
    ['tracks', 1],
    ['benchmarks', expectedCounts.benchmarks],
    ['results', expectedCounts.benchmarks],
    ['settings', expectedCounts.settings],
    ['entries', expectedCounts.entries],
    ['benchmarkResults', expectedCounts.responses],
    ['benchmarkSummaries', expectedCounts.benchmarks]
  ];
  if (data.kind !== 'vasirbenchmark-public-projection') failures.push('projection kind mismatch');
  if (![2, 3, 4, 5, 6].includes(data.schemaVersion)) failures.push('projection schema mismatch');
  if (
    data.scoreBasis?.label !== 'Engineering v2'
    || data.scoreBasis?.edition !== 'backend-architecture-panel-consensus-v2'
    || data.scoreBasis?.method !== 'equal-benchmark-absolute-mean-v1'
    || data.scoreBasis?.judgeCount !== 2
    || canonicalJudgeConfigurationIds.join('|') !== 'codex:gpt-6-astra@xhigh|claude:claude-fable-5-1@max'
    || data.scoreBasis?.batchUnit !== 'matched-pair'
    || data.scoreBasis?.aggregation !== 'unanimity-gates-mean-dimensions-v1'
    || data.scoreBasis?.effectMethod !== 'paired-absolute-delta-v1'
    || data.scoreBasis?.effectUnit !== 'rubric-points'
    || data.scoreBasis?.uncertainty?.status !== 'not-estimated'
  ) failures.push('fixed absolute score basis mismatch');
  if (data.meta?.release !== 'Development snapshot · September 2026') {
    failures.push('projection release month mismatch');
  }
  arrays.forEach(([key, expected]) => {
    if (!Array.isArray(data[key]) || data[key].length !== expected) {
      failures.push(key + ' count ' + (data[key]?.length ?? 'missing') + '/' + expected);
    }
  });

  if ((data.conditions || []).map((condition) => condition.id).join('|') !== expectedConditionIds.join('|')) {
    failures.push('condition ids are not baseline + skill');
  }
  if (
    data.conditions?.[0]?.label !== 'Minimal baseline'
    || data.conditions?.[1]?.label !== 'Architecture skill'
  ) failures.push('condition labels mismatch');
  if (data.categories?.[0]?.id !== 'engineering' || data.categories?.[0]?.name !== 'Engineering') {
    failures.push('published category is not Engineering');
  }
  if ((data.benchmarks || []).map((benchmark) => benchmark.id).join('|') !== expectedBenchmarkIds.join('|')) {
    failures.push('benchmark ids/order mismatch');
  }
  if (
    data.availability?.status !== 'development'
    || data.availability?.verification !== 'unverified'
    || data.availability?.blockers?.map((blocker) => blocker.code).join('|') !== [
      'author-calibration-pending',
      'panel-audit-required',
      'public-eligibility-unverified'
    ].join('|')
  ) failures.push('development availability boundary mismatch');
  if (target !== 'report') {
    const mastScope = text(document.querySelector('.benchmark-mast__scope'));
    const expectedScope = expectedCounts.settings + ' model settings';
    const expectedResponses = expectedCounts.responses + ' responses';
    if (!mastScope.includes(expectedScope) || !mastScope.includes(expectedResponses)) {
      failures.push('masthead cardinality mismatch');
    }
    if (text(document.querySelector('.benchmark-mast__issue')) !== 'Issue 09 · Sep 2026') {
      failures.push('masthead issue/month mismatch');
    }
    const expectedEquation = expectedCounts.benchmarks
      + ' benchmarks × '
      + expectedCounts.settings
      + ' settings × '
      + expectedCounts.conditions
      + ' conditions = '
      + expectedCounts.responses
      + ' responses';
    if (!text(document.querySelector('.benchmark-footer')).includes(expectedEquation)) {
      failures.push('footer cardinality equation mismatch');
    }
  }
  if (data.meta?.runs !== expectedCounts.benchmarks || data.meta?.aggregateCells !== expectedCounts.responses) {
    failures.push(
      'run/cell cardinality mismatch (expected '
      + expectedCounts.benchmarks
      + ' source runs and '
      + expectedCounts.responses
      + ' aggregate cells)'
    );
  }

  const privatePattern = /(?:\/home\/|file:\/\/|artifacts\/evaluations|evaluations\/runs\/)/i;
  const { aiWorkflows: separateWorkflowProjection, overall: separateOverallProjection, games: separateGamesProjection, ...engineeringProjection } = data;
  const serializedData = JSON.stringify(engineeringProjection);
  if (privatePattern.test(serializedData) || serializedData.includes('/Users/')) failures.push('public projection leaks a private filesystem or artifact path');
  if (/\b(?:illustrative|mock|fixture)\b/i.test(serializedData)) failures.push('public projection contains fake-data language');
  if (/\b(?:with vasir|without vasir|full vasir)\b/i.test(serializedData)) failures.push('public projection contains retired condition labels');
  if (/\b(?:peer index|peer score|outcome elo)\b/i.test(serializedData)) failures.push('public projection contains retired score language');

  const settingIds = (data.settings || []).map((setting) => setting.id);
  const entryIds = (data.entries || []).map((entry) => entry.id);
  if (new Set(settingIds).size !== expectedCounts.settings) {
    failures.push('settings are not ' + expectedCounts.settings + ' unique ids');
  }
  if (new Set(entryIds).size !== expectedCounts.entries) {
    failures.push('entries are not ' + expectedCounts.entries + ' unique ids');
  }
  const fableSettings = (data.settings || []).filter((setting) => (
    expectedFableConfigurationIds.includes(setting.configurationId)
  ));
  if (
    fableSettings.length !== expectedFableConfigurationIds.length
    || new Set(fableSettings.map((setting) => setting.configurationId)).size !== expectedFableConfigurationIds.length
  ) {
    failures.push('Fable 5.1 settings are not the exact xhigh + max + ultracode cohort');
  }
  fableSettings.forEach((setting) => {
    if (setting.family !== expectedFableLabel) {
      failures.push(setting.configurationId + ': public model identity is not ' + expectedFableLabel);
    }
  });

  const astraSettings = (data.settings || []).filter((setting) => (
    expectedAstraConfigurationIds.includes(setting.configurationId)
  ));
  if (
    astraSettings.length !== expectedAstraConfigurationIds.length
    || new Set(astraSettings.map((setting) => setting.configurationId)).size !== expectedAstraConfigurationIds.length
  ) {
    failures.push('GPT-6 Astra settings are not the exact low through ultra cohort');
  }
  astraSettings.forEach((setting) => {
    if (setting.family !== 'GPT-6 Astra' || setting.provider !== 'codex') {
      failures.push(setting.configurationId + ': public model identity is not GPT-6 Astra');
    }
  });

  const claudeSettings = (data.settings || []).filter((setting) => (
    String(setting.configurationId).startsWith('claude:')
  ));
  if (claudeSettings.length !== expectedClaudeSettingCount) {
    failures.push('versioned Claude setting count ' + claudeSettings.length + '/' + expectedClaudeSettingCount);
  }
  claudeSettings.forEach((setting) => {
    const expectedLabel = expectedClaudeModelLabels[setting.modelId];
    if (
      !expectedLabel
      || setting.provider !== 'claude'
      || setting.family !== expectedLabel
      || setting.label !== expectedLabel + ' · ' + setting.reasoning
    ) {
      failures.push(setting.configurationId + ': Claude release identity is not explicit and exact');
    }
  });

  const claudeEntries = (data.entries || []).filter((entry) => (
    String(entry.configurationId).startsWith('claude:')
  ));
  if (claudeEntries.length !== expectedClaudeSettingCount * expectedCounts.conditions) {
    failures.push(
      'versioned Claude entry count '
      + claudeEntries.length
      + '/'
      + (expectedClaudeSettingCount * expectedCounts.conditions)
    );
  }
  claudeEntries.forEach((entry) => {
    const expectedLabel = expectedClaudeModelLabels[entry.modelId];
    if (
      !expectedLabel
      || entry.provider !== 'claude'
      || entry.family !== expectedLabel
      || entry.label !== expectedLabel + ' · ' + entry.reasoning
    ) {
      failures.push(entry.id + ': Claude entry release identity is not explicit and exact');
    }
  });

  (data.settings || []).forEach((setting) => {
    expectedConditionIds.forEach((condition) => {
      const matches = (data.entries || []).filter((entry) => (
        entry.settingId === setting.id && entry.condition === condition
      ));
      if (matches.length !== 1) failures.push(setting.id + ': ' + condition + ' entry count ' + matches.length + '/1');
    });
  });
  (data.entries || []).forEach((entry) => {
    if (!settingById.has(entry.settingId)) failures.push(entry.id + ': unknown setting');
    if (!expectedConditionIds.includes(entry.condition)) failures.push(entry.id + ': unknown condition');
    if (!close(scoreFor(entry), Number(entry.score), 0.001)) failures.push(entry.id + ': invalid overall score');
    if (!Number.isFinite(scoreFor(entry, 'engineering'))) failures.push(entry.id + ': missing Engineering score');
    if (!Number.isFinite(entry.latency) || entry.latency <= 0) failures.push(entry.id + ': invalid latency');
    if (!Number.isFinite(entry.tokens) || entry.tokens <= 0) failures.push(entry.id + ': invalid output tokens');
    if (entry.cost != null || entry.metrics?.costUsd != null) failures.push(entry.id + ': incomplete cost was published');
  });

  const resultKeys = new Set();
  (data.benchmarkResults || []).forEach((result) => {
    const key = result.benchmarkId + '|' + result.settingId + '|' + result.condition;
    if (resultKeys.has(key)) failures.push('duplicate benchmark result ' + key);
    resultKeys.add(key);
    if (!expectedBenchmarkIds.includes(result.benchmarkId)) failures.push(key + ': unknown benchmark');
    if (!settingById.has(result.settingId)) failures.push(key + ': unknown setting');
    if (!expectedConditionIds.includes(result.condition)) failures.push(key + ': unknown condition');
    if (!Number.isFinite(result.score) || result.score < 0 || result.score > 100) failures.push(key + ': invalid score');
    if (result.status !== 'development' || result.calibrated !== false) failures.push(key + ': evidence status mismatch');
    if (result.costUsd != null) failures.push(key + ': incomplete cost was published');
  });
  expectedBenchmarkIds.forEach((benchmarkId) => {
    settingIds.forEach((settingId) => {
      expectedConditionIds.forEach((condition) => {
        const key = benchmarkId + '|' + settingId + '|' + condition;
        if (!resultKeys.has(key)) failures.push('missing benchmark result ' + key);
      });
    });
  });

  if (target !== 'report' && (!window.d3?.scaleLinear || !/^7\./.test(window.d3.version || ''))) {
    failures.push('D3 v7 runtime is unavailable');
  }

  const auditChrome = (context, expectedCategory, expectedMode) => {
    requireTruth(context, '.capability-canvas__status');
    const selectors = [...document.querySelectorAll('.capability-selector__tab[data-category-id]')];
    const modes = [...document.querySelectorAll('.capability-mode__tab[data-capability-mode]')];
    const expectedSelectorIds = data.overall
      ? ['overall', 'engineering', 'games', 'writing', 'product-design', 'ai-workflows']
      : ['overall', 'engineering', ...(data.aiWorkflows?.categories || []).map(category => category.id)];
    if (selectors.length !== expectedSelectorIds.length) failures.push(context + ': category selector count mismatch');
    if (selectors.map((tab) => tab.dataset.categoryId).join('|') !== expectedSelectorIds.join('|')) {
      failures.push(context + ': category selector ids mismatch');
    }
    const overallTab = document.querySelector('#capability-category-overall');
    if (['.capability-selector__long', '.capability-selector__short'].some(selector => text(overallTab?.querySelector(selector)) !== 'Overall')) {
      failures.push(context + ': Overall sidebar label mismatch');
    }
    if (expectedCategory === 'overall' && text(document.querySelector('#capability-question')) !== 'Overall') {
      failures.push(context + ': Overall header label mismatch');
    }
    const selectedCategories = selectors.filter((tab) => tab.getAttribute('aria-selected') === 'true');
    if (selectedCategories.length !== 1 || selectedCategories[0]?.dataset.categoryId !== expectedCategory) {
      failures.push(context + ': selected category mismatch');
    }
    if (modes.length !== 3 || modes.map((tab) => tab.dataset.capabilityMode).join('|') !== 'models|benchmarks|efficiency') {
      failures.push(context + ': evidence mode tabs mismatch');
    }
    const selectedModes = modes.filter((tab) => tab.getAttribute('aria-selected') === 'true');
    if (selectedModes.length !== 1 || selectedModes[0]?.dataset.capabilityMode !== expectedMode) {
      failures.push(context + ': selected evidence mode mismatch');
    }
    if (modes.filter((tab) => tab.tabIndex === 0).length !== 1) {
      failures.push(context + ': mode roving tabindex mismatch');
    }
    modes.forEach((tab) => {
      if (!document.getElementById(tab.getAttribute('aria-controls') || '')) {
        failures.push(context + ': unresolved tab control ' + tab.dataset.capabilityMode);
      }
    });
    auditDocument(context);
  };

  const auditCombined = async () => {
    const context = 'Combined leaderboard';
    if (await routeTo('capabilities/overall') !== '#capabilities/overall') failures.push(context + ': route mismatch');
    auditChrome(context, 'overall', 'models');

    const expectedSkill = sortedCondition('skill', 'overall');
    const baselineRanks = ranksFor('baseline', 'overall');
    const skillRanks = ranksFor('skill', 'overall');
    const rows = [...document.querySelectorAll('.result-list > .setting-row')].filter(isVisible);
    if (rows.length !== 10) failures.push(context + ': collapsed row count ' + rows.length + '/10');

    rows.forEach((row, index) => {
      const skill = expectedSkill[index];
      const baseline = baselineBySetting.get(skill?.settingId);
      const prefix = context + ' row ' + (index + 1) + ': ';
      if (!skill || !baseline) {
        failures.push(prefix + 'matched data missing');
        return;
      }
      if (row.dataset.settingId !== skill.settingId) failures.push(prefix + 'setting order mismatch');
      if (row.dataset.fullEntryId !== skill.id || row.dataset.baselineEntryId !== baseline.id) {
        failures.push(prefix + 'entry ids mismatch');
      }
      if (!close(number(row.dataset.fullScore), skill.score) || !close(number(row.dataset.baselineScore), baseline.score)) {
        failures.push(prefix + 'row score data mismatch');
      }
      if (
        number(row.dataset.fullRank) !== skillRanks.get(skill.id)
        || number(row.dataset.baselineRank) !== baselineRanks.get(baseline.id)
      ) failures.push(prefix + 'row rank mismatch');
      if (!close(number(row.dataset.delta), skill.score - baseline.score)) failures.push(prefix + 'row delta mismatch');

      const compositions = [...row.querySelectorAll('.capability-composition')];
      if (compositions.length !== 2) failures.push(prefix + 'paired composition count ' + compositions.length + '/2');
      compositions.forEach((composition) => {
        const entry = entryById.get(composition.dataset.entryId);
        const segment = composition.querySelector('.capability-composition__segment');
        const stack = composition.querySelector('.capability-composition__stack');
        if (!entry || !segment || !stack) {
          failures.push(prefix + 'composition is incomplete');
          return;
        }
        if (composition.dataset.condition !== entry.condition) failures.push(prefix + 'condition mismatch');
        if (!close(number(composition.dataset.compositeScore), entry.score)) failures.push(prefix + 'composite score mismatch');
        if (composition.querySelectorAll('.capability-composition__segment').length !== 1) {
          failures.push(prefix + 'must have exactly one Engineering segment');
        }
        const engineeringScore = scoreFor(entry, 'engineering');
        if (!close(number(segment.dataset.rawScore), engineeringScore)) failures.push(prefix + 'segment raw score mismatch');
        if (!close(number(segment.dataset.contribution), entry.score, 0.001)) failures.push(prefix + 'segment contribution mismatch');
        if (/[+−]/.test(text(segment))) failures.push(prefix + 'segment leaked redundant delta text');
        const stackWidth = stack.getBoundingClientRect().width;
        const segmentWidth = segment.getBoundingClientRect().width;
        const expectedWidth = stackWidth * entry.score / 100;
        if (!close(segmentWidth, expectedWidth, 1.25)) {
          failures.push(prefix + 'segment width is not on shared 0–100 scale');
        }
        if (!close(number(composition.querySelector('.capability-composition__total')?.textContent), entry.score)) {
          failures.push(prefix + 'visible total mismatch');
        }
      });
    });

    const showAll = document.querySelector('#show-all');
    const settingCountPattern = new RegExp('\\b' + expectedCounts.settings + '\\b');
    if (!isVisible(showAll) || showAll.getAttribute('aria-expanded') !== 'false' || !settingCountPattern.test(text(showAll))) {
      failures.push(context + ': 10→' + expectedCounts.settings + ' disclosure mismatch');
    } else {
      showAll.click();
      await settle();
      const expandedRows = [...document.querySelectorAll('.result-list > .setting-row')].filter(isVisible);
      if (expandedRows.length !== expectedCounts.settings) {
        failures.push(context + ': expanded row count ' + expandedRows.length + '/' + expectedCounts.settings);
      }
      if (expandedRows.map((row) => row.dataset.settingId).join('|') !== expectedSkill.map((entry) => entry.settingId).join('|')) {
        failures.push(context + ': expanded setting order mismatch');
      }
      auditClaudeIdentityFit(context + ' expanded', '.setting-row__model > strong', expectedClaudeSettingCount);
      const expandedButton = document.querySelector('#show-all');
      if (expandedButton?.getAttribute('aria-expanded') !== 'true') failures.push(context + ': disclosure did not expose expanded state');
      expandedButton?.click();
      await settle();
      if ([...document.querySelectorAll('.result-list > .setting-row')].filter(isVisible).length !== 10) {
        failures.push(context + ': disclosure did not restore top 10');
      }
    }
  };

  const auditEngineering = async () => {
    const context = 'Engineering leaderboard';
    if (await routeTo('capabilities/engineering') !== '#capabilities/engineering') failures.push(context + ': route mismatch');
    auditChrome(context, 'engineering', 'models');

    const expectedSkill = sortedCondition('skill', 'engineering');
    const baselineRanks = ranksFor('baseline', 'engineering');
    const skillRanks = ranksFor('skill', 'engineering');
    const rows = [...document.querySelectorAll('.capability-rank-row[data-setting-id]')].filter(isVisible);
    if (rows.length !== expectedCounts.settings) {
      failures.push(context + ': dumbbell row count ' + rows.length + '/' + expectedCounts.settings);
    }
    if (document.querySelector('#show-all')) failures.push(context + ': named leaderboard should not collapse');
    auditClaudeIdentityFit(context, '.capability-rank-row__model > strong', expectedClaudeSettingCount);

    rows.forEach((row, index) => {
      const skill = expectedSkill[index];
      const baseline = baselineBySetting.get(skill?.settingId);
      const prefix = context + ' row ' + (index + 1) + ': ';
      if (!skill || !baseline) {
        failures.push(prefix + 'matched data missing');
        return;
      }
      const skillScore = scoreFor(skill, 'engineering');
      const baselineScore = scoreFor(baseline, 'engineering');
      if (row.dataset.settingId !== skill.settingId) failures.push(prefix + 'setting order mismatch');
      if (!close(number(row.dataset.fullScore), skillScore) || !close(number(row.dataset.baselineScore), baselineScore)) {
        failures.push(prefix + 'score data mismatch');
      }
      if (
        number(row.dataset.fullRank) !== skillRanks.get(skill.id)
        || number(row.dataset.baselineRank) !== baselineRanks.get(baseline.id)
      ) failures.push(prefix + 'rank mismatch');

      const track = row.querySelector('.capability-rank-row__track');
      const connector = row.querySelector('.capability-rank-row__connector');
      const baselineMarker = row.querySelector('.capability-rank-row__marker--baseline');
      const skillMarker = row.querySelector('.capability-rank-row__marker--full');
      if (![track, connector, baselineMarker, skillMarker].every(isVisible)) {
        failures.push(prefix + 'dumbbell marks are not all visible');
        return;
      }
      const trackBox = track.getBoundingClientRect();
      const baselineBox = baselineMarker.getBoundingClientRect();
      const skillBox = skillMarker.getBoundingClientRect();
      const connectorBox = connector.getBoundingClientRect();
      const baselineX = baselineBox.left + baselineBox.width / 2;
      const skillX = skillBox.left + skillBox.width / 2;
      if (!close(baselineX, trackBox.left + trackBox.width * baselineScore / 100, 2)) {
        failures.push(prefix + 'baseline marker is not on shared scale');
      }
      if (!close(skillX, trackBox.left + trackBox.width * skillScore / 100, 2)) {
        failures.push(prefix + 'skill marker is not on shared scale');
      }
      const expectedConnector = trackBox.width * Math.max(Math.abs(skillScore - baselineScore), 0.25) / 100;
      if (!close(connectorBox.width, expectedConnector, 2.5)) failures.push(prefix + 'connector length mismatch');
      const connectorStyle = getComputedStyle(connector);
      if (
        connectorBox.height < 2
        || connectorStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
        || Number(connectorStyle.opacity) < 0.9
      ) failures.push(prefix + 'connector is too faint');
    });

    const axisText = text(document.querySelector('.capability-ranking__axis'));
    const conditionHeadings = [...document.querySelectorAll('.capability-ranking__axis .capability-ranking__condition-heading')];
    if (
      !/0\s*25\s*50\s*75\s*100/.test(axisText)
      || conditionHeadings.length !== data.conditions.length
      || data.conditions.some((condition, index) => text(conditionHeadings[index]) !== (condition.short || condition.label)
        || conditionHeadings[index]?.getAttribute('title') !== condition.label)
    ) failures.push(context + ': shared score axis/condition labels mismatch');
  };

  const auditBenchmarks = async () => {
    const context = 'Engineering benchmark ledger';
    if (await routeTo('capabilities/engineering/benchmarks') !== '#capabilities/engineering/benchmarks') {
      failures.push(context + ': route mismatch');
    }
    auditChrome(context, 'engineering', 'benchmarks');

    const tracks = [...document.querySelectorAll('.benchmark-ledger__track')].filter(isVisible);
    const rows = [...document.querySelectorAll('.benchmark-ledger__row[data-benchmark-id]')].filter(isVisible);
    if (tracks.length !== 1) failures.push(context + ': track count ' + tracks.length + '/1');
    if (rows.length !== 3) failures.push(context + ': row count ' + rows.length + '/3');
    if (text(tracks[0]?.querySelector('h4')) !== 'Backend Architecture') {
      failures.push(context + ': track title mismatch');
    }
    rows.forEach((row, index) => {
      const benchmark = data.benchmarks[index];
      const summary = summaryById.get(benchmark?.id);
      const prefix = context + ' row ' + (index + 1) + ': ';
      if (!benchmark || !summary) {
        failures.push(prefix + 'projection record missing');
        return;
      }
      if (row.dataset.benchmarkId !== benchmark.id || row.dataset.evidenceKind !== 'development') {
        failures.push(prefix + 'identity/evidence mismatch');
      }
      if (!close(number(row.dataset.baselineScore), summary.baseline) || !close(number(row.dataset.treatmentScore), summary.treatment)) {
        failures.push(prefix + 'summary score mismatch');
      }
      if (text(row.querySelector('.benchmark-ledger__identity strong')) !== benchmark.name) {
        failures.push(prefix + 'visible title mismatch');
      }
      const runLabel = row.querySelector('.benchmark-ledger__evidence span[title]');
      if (runLabel?.getAttribute('title') !== summary.runId) failures.push(prefix + 'source run provenance missing');
      const href = row.getAttribute('href') || '';
      if (!href.endsWith('benchmark-report.html#' + benchmark.id)) failures.push(prefix + 'report route mismatch');
    });
  };

  const auditOverallBenchmarks = async () => {
    const context = 'Overall benchmark ledger';
    if (await routeTo('capabilities/overall/benchmarks') !== '#capabilities/overall/benchmarks') {
      failures.push(context + ': route mismatch');
    }
    auditChrome(context, 'overall', 'benchmarks');

    const tracks = [...document.querySelectorAll('.benchmark-ledger__track')].filter(isVisible);
    const rows = [...document.querySelectorAll('.benchmark-ledger__row[data-benchmark-id]')].filter(isVisible);
    if (tracks.length !== 1) failures.push(context + ': track count ' + tracks.length + '/1');
    if (rows.length !== 3) failures.push(context + ': row count ' + rows.length + '/3');
    rows.forEach((row, index) => {
      const benchmark = data.benchmarks[index];
      const expectedHref = './benchmark-report.html?from=overall#' + benchmark.id;
      if (row.dataset.benchmarkId !== benchmark.id) failures.push(context + ': row order mismatch at ' + (index + 1));
      if (row.getAttribute('href') !== expectedHref) {
        failures.push(context + ': Combined-context report route mismatch for ' + benchmark.id);
      }
    });
  };

  const auditEfficiencyPoints = (metric, context, field = 'overall') => {
    const points = [...document.querySelectorAll('[data-plot-point][data-entry-id]')].filter(isVisible);
    if (points.length !== expectedCounts.entries) {
      failures.push(context + ': plot point count ' + points.length + '/' + expectedCounts.entries);
    }
    if (new Set(points.map((point) => point.dataset.entryId)).size !== points.length) {
      failures.push(context + ': duplicate plot point ids');
    }
    const values = data.entries.map((entry) => Number(entry[metric]));
    const observedMinimum = Math.min(...values);
    const observedMaximum = Math.max(...values);
    const minimum = Math.max(Number.MIN_VALUE, observedMinimum * 0.9);
    const maximum = observedMaximum === observedMinimum ? observedMaximum * 1.1 : observedMaximum * 1.1;
    const position = (value) => Math.max(0, Math.min(100, (
      (Math.log(value) - Math.log(minimum)) / (Math.log(maximum) - Math.log(minimum))
    ) * 100));

    points.forEach((point) => {
      const entry = entryById.get(point.dataset.entryId);
      if (!entry) {
        failures.push(context + ': point has unknown entry ' + point.dataset.entryId);
        return;
      }
      const expectedScore = scoreFor(entry, field);
      if (!close(number(point.dataset.score), expectedScore)) failures.push(context + ': point score mismatch ' + entry.id);
      if (!close(number(point.dataset.resource), entry[metric], 0.001)) failures.push(context + ': point resource mismatch ' + entry.id);
      if (!close(number(point.dataset.plotX), position(entry[metric]), 0.01)) failures.push(context + ': point x mismatch ' + entry.id);
      if (!close(number(point.dataset.plotY), 100 - expectedScore, 0.01)) failures.push(context + ': point y mismatch ' + entry.id);
    });
    if (points.filter((point) => point.tabIndex === 0).length !== 1) {
      failures.push(context + ': plot roving tabindex mismatch');
    }
    const tickLabels = [...document.querySelectorAll('.efficiency-plane__x-ticks span')]
      .filter(isVisible)
      .map((label) => ({ label: text(label), box: label.getBoundingClientRect() }))
      .sort((left, right) => left.box.left - right.box.left);
    if (viewportWidth > 1080 && tickLabels.length < 2) {
      failures.push(context + ': resource axis has fewer than two visible labels');
    }
    for (let index = 1; index < tickLabels.length; index += 1) {
      const previous = tickLabels[index - 1];
      const current = tickLabels[index];
      if (previous.box.right > current.box.left - 1) {
        failures.push(
          context + ': overlapping resource labels ' + previous.label + ' / ' + current.label
        );
      }
    }
  };

  const auditEfficiencyClaudeOptions = (context, entrySelect) => {
    const optionByEntryId = new Map(
      [...entrySelect?.options || []].map((option) => [option.value, text(option)])
    );
    claudeEntries.forEach((entry) => {
      const optionText = optionByEntryId.get(entry.id) || '';
      const expectedLabel = expectedClaudeModelLabels[entry.modelId];
      if (!expectedLabel || !optionText.includes('· ' + expectedLabel + ' ·')) {
        failures.push(context + ': efficiency option omits exact release identity for ' + entry.id);
      }
    });
  };

  const auditEfficiency = async () => {
    const context = 'Overall efficiency';
    if (await routeTo('capabilities/overall/efficiency') !== '#capabilities/overall/efficiency') {
      failures.push(context + ': route mismatch');
    }
    auditChrome(context, 'overall', 'efficiency');

    const entrySelect = document.querySelector('#efficiency-entry');
    const resourceSelect = document.querySelector('#resource-axis');
    const selects = [...document.querySelectorAll('.capability-efficiency select')].filter(isVisible);
    if (selects.length !== 2 || !entrySelect || !resourceSelect) failures.push(context + ': expected two controls');
    if ([...resourceSelect?.options || []].map((option) => option.value).join('|') !== 'latency|tokens') {
      failures.push(context + ': resource axes are not latency + tokens only');
    }
    if ([...entrySelect?.options || []].length !== expectedCounts.entries) {
      failures.push(context + ': selected-result options are not ' + expectedCounts.entries + ' entries');
    }
    auditEfficiencyClaudeOptions(context, entrySelect);
    if (text(document.querySelector('.efficiency-controls__label strong')) !== expectedCounts.entries + ' setting × condition results') {
      failures.push(context + ': result cardinality label mismatch');
    }
    if (/\bcost\b/i.test(text(document.querySelector('.capability-efficiency')))) {
      failures.push(context + ': incomplete cost axis is visible');
    }
    auditEfficiencyPoints('latency', context + ' / latency');

    if (resourceSelect) {
      resourceSelect.value = 'tokens';
      resourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
      if (location.hash !== '#capabilities/overall/efficiency') failures.push(context + ': resource change broke route');
      auditEfficiencyPoints('tokens', context + ' / tokens');
      resourceSelect.value = 'latency';
      resourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    }
  };

  const auditEngineeringEfficiency = async () => {
    const context = 'Engineering efficiency';
    if (await routeTo('capabilities/engineering/efficiency') !== '#capabilities/engineering/efficiency') {
      failures.push(context + ': route mismatch');
    }
    auditChrome(context, 'engineering', 'efficiency');

    const entrySelect = document.querySelector('#efficiency-entry');
    const resourceSelect = document.querySelector('#resource-axis');
    if (!entrySelect || !resourceSelect) failures.push(context + ': controls missing');
    if ([...resourceSelect?.options || []].map((option) => option.value).join('|') !== 'latency|tokens') {
      failures.push(context + ': resource axes are not latency + tokens only');
    }
    if ([...entrySelect?.options || []].length !== expectedCounts.entries) {
      failures.push(context + ': selected-result options are not ' + expectedCounts.entries + ' entries');
    }
    auditEfficiencyClaudeOptions(context, entrySelect);
    if (text(document.querySelector('.efficiency-controls__label strong')) !== expectedCounts.entries + ' setting × condition results') {
      failures.push(context + ': result cardinality label mismatch');
    }
    if (/\bcost\b/i.test(text(document.querySelector('.capability-efficiency')))) {
      failures.push(context + ': incomplete cost axis is visible');
    }
    auditEfficiencyPoints('latency', context + ' / latency', 'engineering');

    if (resourceSelect) {
      resourceSelect.value = 'tokens';
      resourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
      if (location.hash !== '#capabilities/engineering/efficiency') failures.push(context + ': resource change broke route');
      if (document.querySelector('.capability-selector__tab[aria-selected="true"]')?.dataset.categoryId !== 'engineering') {
        failures.push(context + ': resource change lost Engineering selection');
      }
      auditEfficiencyPoints('tokens', context + ' / tokens', 'engineering');
      resourceSelect.value = 'latency';
      resourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    }
  };

  const auditModelRunTranscripts = async (context, benchmark, expectedRows, rows) => {
    const selectedPositions = [
      { label: 'first', index: 0 },
      { label: 'middle', index: Math.floor(rows.length / 2) },
      { label: 'last', index: rows.length - 1 }
    ];
    const isMobileReport = matchMedia('(max-width: 46rem)').matches;

    rows.forEach((row) => {
      row.open = false;
    });

    for (const position of selectedPositions) {
      const row = rows[position.index];
      const expected = expectedRows[position.index];
      if (!row || !expected?.setting) {
        failures.push(context + ': missing ' + position.label + ' transcript row');
        continue;
      }

      const summary = row.querySelector(':scope > summary');
      if (!summary || !isVisible(summary)) {
        failures.push(context + ': ' + position.label + ' transcript row lacks a visible native summary');
        continue;
      }
      summary.click();
      await settle();
      if (!row.open) {
        failures.push(context + ': ' + position.label + ' transcript row did not open');
        continue;
      }

      for (const condition of expectedConditionIds) {
        const pane = row.querySelector('[data-condition="' + condition + '"]');
        if (!pane || !isVisible(pane)) {
          failures.push(context + ': ' + position.label + ' row lacks visible ' + condition + ' transcript');
          continue;
        }

        const response = transcriptIndex.responseByKey.get(transcriptKey(
          benchmark.id,
          expected.setting.id,
          condition,
          1
        ));
        if (!response) {
          failures.push(
            context + ': missing bundled ' + condition + ' response for ' + expected.setting.id
          );
          continue;
        }
        const messageSet = transcriptIndex.messageSetById.get(response.messageSetId);
        if (!messageSet) {
          failures.push(
            context + ': missing bundled message set for ' + condition + ' response ' + expected.setting.id
          );
          continue;
        }

        const renderedOutput = pane.querySelector('[data-output-text]');
        if (!renderedOutput || !isVisible(renderedOutput)) {
          failures.push(context + ': ' + position.label + ' ' + condition + ' output is missing');
        } else if (renderedOutput.textContent !== response.outputText) {
          failures.push(context + ': ' + position.label + ' ' + condition + ' output is not exact');
        }

        const promptDetails = pane.querySelectorAll('details.model-run__prompt');
        const prompt = promptDetails.length === 1 ? promptDetails[0] : null;
        const judgingDetails = pane.querySelectorAll('details.model-run__judging');
        const judging = judgingDetails.length === 1 ? judgingDetails[0] : null;
        if (!judging) {
          failures.push(
            context
            + ': '
            + position.label
            + ' '
            + condition
            + ' judging disclosure count '
            + judgingDetails.length
            + '/1'
          );
        } else {
          if (judging.open) {
            failures.push(context + ': ' + position.label + ' ' + condition + ' judging is initially open');
          }
          if (judging.classList.contains('is-open')) {
            failures.push(
              context + ': ' + position.label + ' ' + condition + ' judging has an initial open-state class'
            );
          }
        }
        let renderedMessages = [];
        if (!prompt) {
          failures.push(
            context
            + ': '
            + position.label
            + ' '
            + condition
            + ' prompt disclosure count '
            + promptDetails.length
            + '/1'
          );
        } else {
          if (prompt.open) {
            failures.push(context + ': ' + position.label + ' ' + condition + ' prompt is initially open');
          }
          const promptSummary = prompt.querySelector(':scope > summary.model-run__prompt-summary');
          if (!promptSummary || !isVisible(promptSummary)) {
            failures.push(
              context + ': ' + position.label + ' ' + condition + ' prompt lacks a visible native summary'
            );
          } else {
            promptSummary.focus({ preventScroll: true });
            if (promptSummary.tabIndex < 0 || document.activeElement !== promptSummary) {
              failures.push(
                context + ': ' + position.label + ' ' + condition + ' prompt summary is not keyboard focusable'
              );
            }
            promptSummary.click();
            await settle();
            if (!prompt.open) {
              failures.push(context + ': ' + position.label + ' ' + condition + ' prompt did not open');
            } else {
              renderedMessages = [...prompt.querySelectorAll('[data-message-content]')];
              if (renderedMessages.length !== messageSet.messages.length) {
                failures.push(
                  context
                  + ': '
                  + position.label
                  + ' '
                  + condition
                  + ' message count '
                  + renderedMessages.length
                  + '/'
                  + messageSet.messages.length
                );
              }
              messageSet.messages.forEach((message, messageIndex) => {
                const renderedMessage = renderedMessages[messageIndex];
                if (!isVisible(renderedMessage) || renderedMessage.textContent !== message.content) {
                  failures.push(
                    context
                    + ': '
                    + position.label
                    + ' '
                    + condition
                    + ' message '
                    + (messageIndex + 1)
                    + ' is not visibly exact'
                  );
                }
              });
            }

            if (isMobileReport && prompt.open) {
              const promptOverflowElements = [
                { element: pane, label: condition + ' pane' },
                { element: prompt, label: condition + ' prompt' },
                ...renderedMessages.map((element, index) => ({
                  element,
                  label: condition + ' message ' + (index + 1)
                })),
                { element: renderedOutput, label: condition + ' output' }
              ];
              promptOverflowElements.forEach(({ element, label }) => {
                if (!element) return;
                const box = element.getBoundingClientRect();
                if (
                  box.left < -1
                  || box.right > innerWidth + 1
                  || element.scrollWidth > element.clientWidth + 1
                ) {
                  failures.push(
                    context + ': mobile ' + position.label + ' ' + label + ' overflows horizontally'
                  );
                }
              });
              const expandedDocumentWidth = Math.max(
                document.documentElement.scrollWidth,
                document.body?.scrollWidth || 0
              );
              const expandedRowBox = row.getBoundingClientRect();
              if (
                expandedDocumentWidth > innerWidth + 1
                || expandedRowBox.left < -1
                || expandedRowBox.right > innerWidth + 1
                || row.scrollWidth > row.clientWidth + 1
              ) {
                failures.push(
                  context
                  + ': mobile '
                  + position.label
                  + ' '
                  + condition
                  + ' expanded prompt causes horizontal overflow'
                );
              }
            }

            if (prompt.open) {
              promptSummary.click();
              await settle();
            }
            if (prompt.open) {
              failures.push(context + ': ' + position.label + ' ' + condition + ' prompt did not close');
            }
          }
        }

        if (judging) {
          const judgingSummary = judging.querySelector(':scope > summary.model-run__judging-summary');
          if (!judgingSummary || !isVisible(judgingSummary)) {
            failures.push(
              context + ': ' + position.label + ' ' + condition + ' judging lacks a visible native summary'
            );
          } else {
            judgingSummary.focus({ preventScroll: true });
            const summaryHeight = judgingSummary.getBoundingClientRect().height;
            if (judgingSummary.tabIndex < 0 || document.activeElement !== judgingSummary) {
              failures.push(
                context + ': ' + position.label + ' ' + condition + ' judging summary is not keyboard focusable'
              );
            }
            if (summaryHeight < 44) {
              failures.push(
                context
                + ': '
                + position.label
                + ' '
                + condition
                + ' judging summary touch target is '
                + summaryHeight.toFixed(1)
                + 'px/44px'
              );
            }

            judgingSummary.click();
            await settle();
            if (!judging.open || !judging.classList.contains('is-open')) {
              failures.push(
                context + ': ' + position.label + ' ' + condition + ' judging did not enter its open state'
              );
            }
            if (prompt?.open) {
              failures.push(
                context + ': ' + position.label + ' ' + condition + ' judging opened the sibling prompt'
              );
            }

            const renderedReviews = [...judging.querySelectorAll('[data-judge-review]')];
            const aggregationNote = text(judging.querySelector('.model-run__aggregation-note'));
            if (
              !aggregationNote.includes('Both judges must pass each gate; either failure applies its gate ceiling.')
              || !aggregationNote.includes('Dimension ratings use the arithmetic mean, including half points.')
              || !aggregationNote.includes('There is no synthesizer.')
            ) {
              failures.push(context + ': ' + position.label + ' ' + condition + ' two-judge aggregation note mismatch');
            }
            if (renderedReviews.length !== 2) {
              failures.push(
                context
                + ': '
                + position.label
                + ' '
                + condition
                + ' judge review count '
                + renderedReviews.length
                + '/2'
              );
            }
            response.judgments.forEach((judgment, judgmentIndex) => {
              const review = renderedReviews[judgmentIndex];
              const reviewContext = context
                + ': '
                + position.label
                + ' '
                + condition
                + ' judge '
                + (judgmentIndex + 1);
              if (!hasExactKeys(judgment, judgmentKeys)) {
                failures.push(reviewContext + ' bundled judgment is invalid');
                return;
              }
              const judgeSetting = settingByConfigurationId.get(judgment.judgeConfigurationId);
              if (!review || !isVisible(review)) {
                failures.push(reviewContext + ' review is missing');
                return;
              }

              const renderedConfiguration = review.querySelector('[data-judge-configuration]');
              const renderedScore = review.querySelector('[data-judge-score]');
              const renderedRationale = review.querySelector('[data-judge-rationale]');
              const renderedMechanics = review.querySelector('dl[data-judge-mechanics]');
              const renderedRawScore = review.querySelector('[data-judge-raw-score]');
              const renderedGateCap = review.querySelector('[data-judge-gate-cap]');
              const renderedFailedGates = review.querySelector('[data-judge-failed-gates]');
              if (!judgeSetting || text(renderedConfiguration) !== judgeSetting.label) {
                failures.push(reviewContext + ' configuration label is not exact');
              }
              if (text(renderedScore) !== judgment.score.toFixed(1)) {
                failures.push(reviewContext + ' score is not exact to one decimal');
              }
              if (!renderedRationale || renderedRationale.textContent !== judgment.rationale) {
                failures.push(reviewContext + ' rationale is not exact');
              }
              if (!renderedMechanics || !isVisible(renderedMechanics)) {
                failures.push(reviewContext + ' mechanics list is missing');
              } else {
                const mechanicLabels = [...renderedMechanics.querySelectorAll('dt')].map(text);
                if (mechanicLabels.join('|') !== 'Uncapped|Gate ceiling|Failed gates') {
                  failures.push(reviewContext + ' mechanics labels are not exact');
                }
              }
              if (text(renderedRawScore) !== judgment.rawScore.toFixed(1)) {
                failures.push(reviewContext + ' uncapped score is not exact');
              }
              if (text(renderedGateCap) !== judgment.gateCap.toFixed(1)) {
                failures.push(reviewContext + ' gate ceiling is not exact');
              }
              const expectedFailedGates = judgment.failedGates.length
                ? judgment.failedGates.map(humanizeGateId).join(' · ')
                : 'None';
              if (text(renderedFailedGates) !== expectedFailedGates) {
                failures.push(reviewContext + ' failed gates are not exact');
              }
            });

            if (isMobileReport && judging.open) {
              const judgingOverflowElements = [
                { element: pane, label: condition + ' pane' },
                { element: judging, label: condition + ' judging' },
                { element: judgingSummary, label: condition + ' judging summary' },
                ...renderedReviews.flatMap((review, reviewIndex) => [
                  { element: review, label: condition + ' judge ' + (reviewIndex + 1) },
                  {
                    element: review.querySelector('[data-judge-configuration]'),
                    label: condition + ' judge ' + (reviewIndex + 1) + ' configuration'
                  },
                  {
                    element: review.querySelector('[data-judge-rationale]'),
                    label: condition + ' judge ' + (reviewIndex + 1) + ' rationale'
                  },
                  {
                    element: review.querySelector('[data-judge-mechanics]'),
                    label: condition + ' judge ' + (reviewIndex + 1) + ' mechanics'
                  }
                ]),
                { element: renderedOutput, label: condition + ' output' }
              ];
              judgingOverflowElements.forEach(({ element, label }) => {
                if (!element) return;
                const box = element.getBoundingClientRect();
                if (
                  box.left < -1
                  || box.right > innerWidth + 1
                  || element.scrollWidth > element.clientWidth + 1
                ) {
                  failures.push(
                    context + ': mobile ' + position.label + ' ' + label + ' overflows horizontally'
                  );
                }
              });
              const expandedDocumentWidth = Math.max(
                document.documentElement.scrollWidth,
                document.body?.scrollWidth || 0
              );
              const expandedRowBox = row.getBoundingClientRect();
              if (
                expandedDocumentWidth > innerWidth + 1
                || expandedRowBox.left < -1
                || expandedRowBox.right > innerWidth + 1
                || row.scrollWidth > row.clientWidth + 1
              ) {
                failures.push(
                  context
                  + ': mobile '
                  + position.label
                  + ' '
                  + condition
                  + ' expanded judging causes horizontal overflow'
                );
              }
            }

            if (judging.open) {
              judgingSummary.click();
              await settle();
            }
            if (judging.open || judging.classList.contains('is-open')) {
              failures.push(context + ': ' + position.label + ' ' + condition + ' judging did not close');
            }
          }
        }

        if (isMobileReport) {
          const overflowElements = [
            { element: pane, label: condition + ' pane' },
            { element: renderedOutput, label: condition + ' output' }
          ];
          overflowElements.forEach(({ element, label }) => {
            if (!element) return;
            const box = element.getBoundingClientRect();
            if (
              box.left < -1
              || box.right > innerWidth + 1
              || element.scrollWidth > element.clientWidth + 1
            ) {
              failures.push(context + ': mobile ' + position.label + ' ' + label + ' overflows horizontally');
            }
          });
        }
      }

      if (isMobileReport) {
        const documentWidth = Math.max(
          document.documentElement.scrollWidth,
          document.body?.scrollWidth || 0
        );
        const rowBox = row.getBoundingClientRect();
        if (
          documentWidth > innerWidth + 1
          || rowBox.left < -1
          || rowBox.right > innerWidth + 1
          || row.scrollWidth > row.clientWidth + 1
        ) {
          failures.push(context + ': mobile ' + position.label + ' open row causes horizontal overflow');
        }
      }

      row.open = false;
      await settle();
    }
  };

  const auditReports = async () => {
    for (const benchmark of data.benchmarks) {
      const context = 'Report ' + benchmark.id;
      const summary = summaryById.get(benchmark.id);
      if (await routeTo(benchmark.id) !== '#' + benchmark.id) failures.push(context + ': route mismatch');
      const judgeDetails = document.querySelector('[data-report-judge-trial-details]');
      if (!judgeDetails || judgeDetails.open || text(judgeDetails.querySelector(':scope > summary')) !== 'Judge & trial details') failures.push(context + ': shared judge details must start collapsed');
      judgeDetails?.querySelector(':scope > summary')?.click();
      await settle();
      if (!judgeDetails?.open) failures.push(context + ': shared judge details did not open for evidence inspection');
      requireTruth(context, '.evidence-truth');
      const scoringOverview = text(document.querySelector('.report-overview__source'));
      const expectedPanelLabel = canonicalJudgeConfigurationIds
        .map((configurationId) => settingByConfigurationId.get(configurationId)?.label)
        .join(' + ');
      if (
        !scoringOverview.includes(expectedPanelLabel)
        || !scoringOverview.includes('Both judges must pass each gate; either failure applies its gate ceiling.')
        || !scoringOverview.includes('Dimension ratings use the arithmetic mean, including half points.')
        || !scoringOverview.includes('There is no synthesizer.')
      ) failures.push(context + ': exact two-judge scoring method is not visible');
      auditDocument(context);
      if (document.title !== benchmark.name + ' · VasirBench') failures.push(context + ': document title mismatch');
      if (text(document.querySelector('#report-title')) !== benchmark.name) failures.push(context + ': title mismatch');
      if (!text(document.querySelector('.evidence-hero__prompt')).includes(benchmark.prompt)) failures.push(context + ': exact prompt missing');
      if (text(document.querySelector('#ranking-title')) !== 'Model comparison') {
        failures.push(context + ': shared model-comparison heading is missing');
      }
      if (text(document.querySelector('#ranking .ui-eyebrow')) !== 'Engineering v2 field · all ' + expectedCounts.settings + ' settings') {
        failures.push(context + ': complete field cardinality is not explicit');
      }

      const conditionCards = [...document.querySelectorAll('.matched-result__condition')];
      if (
        text(conditionCards[0]?.querySelector('dt')) !== summary.baselineLabel
        || text(conditionCards[1]?.querySelector('dt')) !== summary.treatmentLabel
      ) failures.push(context + ': condition labels mismatch');
      if (
        !close(number(conditionCards[0]?.querySelector('dd strong')?.textContent), summary.baseline)
        || !close(number(conditionCards[1]?.querySelector('dd strong')?.textContent), summary.treatment)
        || !close(number(document.querySelector('.matched-result__delta dd')?.textContent), summary.delta)
      ) failures.push(context + ': hero summary mismatch');

      const renderedLimitations = [...document.querySelectorAll('.report-limitations li')]
        .filter(isVisible)
        .map((element) => text(element));
      if (
        renderedLimitations.length !== benchmark.limitations.length
        || renderedLimitations.some((limitation, index) => limitation !== benchmark.limitations[index])
      ) failures.push(context + ': benchmark limitations mismatch');

      const judgingScope = summary.judgingScope;
      const judgingScopeText = text(document.querySelector('[data-judging-scope]'));
      const scopeIsVisible = judgingScope?.strategy === 'appended-rows-only-v1'
        ? (
          judgingScopeText.includes(String(judgingScope.incumbentResponseCount))
          && judgingScopeText.includes(String(judgingScope.appendedResponseCount))
          && /kept their published scores/i.test(judgingScopeText)
          && /new responses were scored/i.test(judgingScopeText)
        )
        : (
          judgingScopeText.includes(String(judgingScope?.responseCount))
          && /rescored/i.test(judgingScopeText)
          && /generation was reused unchanged/i.test(judgingScopeText)
        );
      if (!scopeIsVisible) failures.push(context + ': judging scope is not visibly disclosed');

      const expectedRows = data.benchmarkResults
        .filter((result) => result.benchmarkId === benchmark.id && result.condition === 'skill')
        .map((skill) => {
          const baseline = data.benchmarkResults.find((candidate) => (
            candidate.benchmarkId === benchmark.id
            && candidate.settingId === skill.settingId
            && candidate.condition === 'baseline'
          ));
          return { skill, baseline, setting: settingById.get(skill.settingId) };
        })
        .sort((left, right) => (
          right.skill.score - left.skill.score
          || right.baseline.score - left.baseline.score
          || left.setting.label.localeCompare(right.setting.label)
        ));
      const rows = [...document.querySelectorAll('details.model-run')].filter(isVisible);
      if (rows.length !== expectedCounts.settings) failures.push(context + ': complete row count ' + rows.length + '/' + expectedCounts.settings);
      rows.forEach((row, index) => {
        const expected = expectedRows[index];
        const scores = [...row.querySelectorAll('.model-preview__score')].map((element) => number(element.textContent));
        if (!expected?.setting) {
          failures.push(context + ': missing expected task-score data');
          return;
        }
        const identity = text(row.querySelector('.model-preview__identity'));
        if (!identity.includes(expected.setting.family) || !identity.toLowerCase().includes(expected.setting.reasoning.toLowerCase())) {
          failures.push(context + ': task-score identity mismatch at row ' + (index + 1));
        }
        if (!close(scores[0], expected.baseline.score) || !close(scores[1], expected.skill.score)) {
          failures.push(context + ': task-score mismatch at row ' + (index + 1));
        }
      });
      await auditModelRunTranscripts(context, benchmark, expectedRows, rows);

      const pagination = [...document.querySelectorAll('.report-pagination__link')];
      if (pagination.length !== 2 || pagination.some((link) => !expectedBenchmarkIds.includes((link.getAttribute('href') || '').slice(1)))) {
        failures.push(context + ': report pagination mismatch');
      }
      const sectionRoutes = [...document.querySelectorAll('[data-report-section]')].map((link) => link.getAttribute('href'));
      ['overview', 'ranking', 'method', 'limitations', 'top'].forEach((section) => {
        if (!sectionRoutes.includes('#' + benchmark.id + '/' + section)) {
          failures.push(context + ': missing section route ' + section);
        }
      });
      judgeDetails?.querySelector(':scope > summary')?.click();
      await settle();
      if (judgeDetails?.open) failures.push(context + ': shared judge details did not close after evidence inspection');
    }
    await routeTo('hyper-scale-chat');
    window.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
  };

  if (target === 'report') {
    await auditReports();
  } else if (data.overall) {
    // Overall is a distinct aggregate; cross-family reloads are driven by the
    // protocol coordinator rather than inside a page evaluation.
    await auditEngineering();
    await auditBenchmarks();
    await auditEngineeringEfficiency();
    await routeTo(target === 'capability-benchmarks'
      ? 'capabilities/engineering/benchmarks'
      : 'capabilities/engineering');
    window.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
  } else {
    await auditCombined();
    await auditEngineering();
    await auditOverallBenchmarks();
    await auditBenchmarks();
    await auditEfficiency();
    await auditEngineeringEfficiency();
    await routeTo(target === 'leaderboard'
      ? 'capabilities/overall'
      : target === 'capabilities'
        ? 'capabilities/engineering'
        : target === 'capability-benchmarks'
          ? 'capabilities/engineering/benchmarks'
          : 'capabilities/overall/efficiency');
    window.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
  }

  return {
    failures,
    d3Version: window.d3?.version || '',
    categoryCount: data.categories?.length || 0,
    benchmarkCount: data.benchmarks?.length || 0,
    settingCount: data.settings?.length || 0,
    entryCount: data.entries?.length || 0,
    resultCount: data.benchmarkResults?.length || 0,
    reportCount: data.benchmarkSummaries?.length || 0,
    fable51SettingCount: fableSettings.length,
    claudeSettingCount: claudeSettings.length,
    finalHash: location.hash,
    viewportWidth
  };
}

async function auditCategoryNavigation(writingCatalogOracle = null) {
  const failures = [];
  if (!window.VASIR_DATA?.overall) return {failures};
  const text = element => element?.textContent.replace(/\s+/g, ' ').trim() || '';
  const visible = element => Boolean(element?.getBoundingClientRect().width && element.getBoundingClientRect().height && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const expected = [
    ['overall', 'Overall', false], ['engineering', 'Engineering', false],
    ['games', 'Games', true], ['writing', 'Writing', true],
    ['product-design', 'Product Design', true], ['ai-workflows', 'AI Workflows', false]
  ];
  const tabs = [...document.querySelectorAll('.capability-selector__tab[data-category-id]')];
  if (tabs.map(tab => tab.dataset.categoryId).join('|') !== expected.map(([id]) => id).join('|')) failures.push('Category navigation must contain Overall and all five declared categories.');
  const state = () => JSON.stringify({
    href: location.href,
    selected: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.dataset.categoryId,
    heading: text(document.querySelector('#capability-question')),
    content: document.querySelector('#capability-field-panel')?.innerHTML,
    focusedId: document.activeElement?.id
  });
  for (const [id, name, planned] of expected) {
    const tab = tabs.find(tab => tab.dataset.categoryId === id);
    const labelVisible = [...(tab?.querySelectorAll('.capability-selector__long, .capability-selector__short') || [])].some(node => visible(node) && text(node));
    if (!visible(tab) || !labelVisible || text(tab?.querySelector('.capability-selector__long')) !== name) failures.push('Category label is missing or invisible: ' + id);
    if (id === 'games' && window.VASIR_DATA.games) {
      if (tab?.tagName !== 'BUTTON' || tab.disabled || tab.dataset.categoryStatus !== 'pilot' || tab.hasAttribute('href') || tab.getAttribute('aria-controls') !== 'capability-field-panel') failures.push('Published Games is not a native homepage category.');
      if (!visible(tab?.querySelector(':scope > strong')) || text(tab?.querySelector(':scope > strong')).includes('↗')) failures.push('Games category must show an observed rating or ratings-available label.');
      if (['data-winner-entry-id', 'data-winner-score', 'data-winner-condition'].some(attribute => tab?.hasAttribute(attribute))) failures.push('Games navigation invents an Overall ranking score.');
      continue;
    }
    if (id === 'writing' && window.VASIR_DATA.writing?.coverage?.caseCount) {
      const writing = window.VASIR_DATA.writing;
      if (tab?.tagName !== 'BUTTON' || tab.disabled || tab.getAttribute('aria-disabled') === 'true' || tab.dataset.categoryStatus !== 'development-index' || tab.hasAttribute('href') || tab.getAttribute('aria-controls') !== 'capability-field-panel') failures.push('Published Writing is not an enabled native homepage category.');
      const expectedScore = Number.isFinite(writing.categoryIndex?.leader?.score) ? writing.categoryIndex.leader.score.toFixed(1) + '/100' : 'Results';
      if (!visible(tab?.querySelector(':scope > strong')) || text(tab?.querySelector(':scope > strong')) !== expectedScore) failures.push('Writing category invents a score or omits its source-derived leader.');
      let writingBenchmarkCount = new Set(writing.benchmarkIds || [writing.benchmarkId]).size;
      if (writing.writingScoreBasis) {
        const sameIds = (left, right) => Array.isArray(left) && Array.isArray(right)
          && new Set(left).size === left.length && new Set(right).size === right.length
          && [...left].sort().join('|') === [...right].sort().join('|');
        const catalog = writing.catalog;
        const currentIds = Array.isArray(catalog) ? catalog.filter(item => !item.archived && !['unscored', 'planned'].includes(item.status)).map(item => item.id) : [];
        const archivedIds = Array.isArray(catalog) ? catalog.filter(item => item.archived).map(item => item.id) : [];
        if (!writingCatalogOracle || !Array.isArray(catalog)
          || JSON.stringify(writing.writingScoreBasis) !== JSON.stringify(writingCatalogOracle.scoreBasis)
          || !sameIds(catalog.map(item => item.id), writingCatalogOracle.benchmarkIds)
          || !sameIds(writing.benchmarkIds, writingCatalogOracle.benchmarkIds)
          || !sameIds(currentIds, writingCatalogOracle.currentBenchmarkIds)
          || !sameIds(archivedIds, writingCatalogOracle.archivedBenchmarkIds)
          || writing.catalogCoverage?.benchmarkCount !== writingCatalogOracle.benchmarkIds.length) {
          failures.push('Writing current and archived benchmark coverage differs from the independent original-source catalog.');
        }
        writingBenchmarkCount = writingCatalogOracle?.currentBenchmarkIds?.length ?? 0;
      }
      const writingIncluded = window.VASIR_DATA.overall.scoreBasis?.edition === 'overall-v3';
      const participation = writingIncluded ? /included in Overall/i.test(tab?.getAttribute('aria-label') || '') && /25%/.test(tab?.getAttribute('aria-label') || '') && !/excluded from Overall/i.test(tab?.getAttribute('aria-label') || '') : tab?.getAttribute('aria-label')?.includes('Excluded from Overall');
      if (!tab?.getAttribute('aria-label')?.includes(writingBenchmarkCount + ' published benchmarks') || !participation) failures.push('Writing category does not disclose published benchmark coverage and edition-specific Overall participation.');
      continue;
    }
    if (!planned) {
      if (!tab || tab.disabled || tab.getAttribute('aria-disabled') === 'true') failures.push('Measured category is disabled: ' + id);
      continue;
    }
    if (!tab || tab.tagName !== 'BUTTON' || !tab.disabled || tab.getAttribute('aria-disabled') !== 'true' || tab.tabIndex !== -1 || tab.getAttribute('aria-selected') !== 'false') failures.push('Planned category is interactive or selected: ' + id);
    if (!visible(tab?.querySelector(':scope > strong')) || text(tab?.querySelector(':scope > strong')) !== '—' || !text(tab).includes('Coming soon')) failures.push('Planned category does not visibly disclose its unavailable score: ' + id);
    if (['data-winner-entry-id', 'data-winner-score', 'data-winner-condition', 'href', 'aria-controls'].some(attribute => tab?.hasAttribute(attribute))) failures.push('Planned category exposes a result or destination: ' + id);
    const before = state();
    tab?.click();
    await settle();
    if (state() !== before) failures.push('Clicking a planned category changes the selected result or route: ' + id);
  }
  return {failures};
}

async function auditGames(target) {
  const root = window.VASIR_DATA;
  const reports = root?.games?.benchmarks ?? (root?.games ? [root.games] : []);
  const failures = [];
  const text = element => element?.textContent.replace(/\s+/g, ' ').trim() || '';
  const visible = element => Boolean(element && element.getBoundingClientRect().width && element.getBoundingClientRect().height && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const pathname = location.pathname;
  const requestedMode = target === 'game-benchmarks' ? 'benchmarks' : target === 'game-efficiency' ? 'efficiency' : 'models';
  const score = run => Number.isFinite(run?.score?.value) ? run.score.value : null;
  const displayScore = run => score(run) ?? ((run?.judgments || []).filter(judge => Number.isFinite(judge.score)).length === 1 ? run.judgments.find(judge => Number.isFinite(judge.score)).score : null);
  const checkReading = (reading, run) => {
    const expected = displayScore(run);
    if (!reading || reading.dataset.gameScore !== String(score(run) ?? '') || reading.dataset.gameDisplayScore !== String(expected ?? '')) failures.push('Games rating differs from published evidence: ' + run.id);
    if (expected !== null && !text(reading?.querySelector('strong')).startsWith(expected.toFixed(1))) failures.push('Available game rating is not visible: ' + run.id);
    if (score(run) === null && expected !== null && !/individual|1 judge/i.test(text(reading))) failures.push('Individual game assessment is not qualified: ' + run.id);
    if (expected === null && !/incomplete|unavailable|pending|—/i.test(text(reading))) failures.push('Unavailable game rating is not qualified: ' + run.id);
    if (reading && reading.scrollWidth > reading.clientWidth + 1) failures.push('Game score or review qualification clips: ' + run.id);
  };
  const runs = reports.flatMap(report => report.runs || []);
  const modes = ['models', 'benchmarks', ...(runs.some(run => Number.isFinite(run.metrics?.durationMs) && run.metrics.durationMs > 0) ? ['efficiency'] : [])];
  if (!reports.length || reports.some(report => !report.benchmark?.id || !Array.isArray(report.configurations) || !Array.isArray(report.conditions) || !Array.isArray(report.runs))) failures.push('Games collection does not contain published benchmark payloads.');
  if (new Set(reports.map(report => report.benchmark.id)).size !== reports.length) failures.push('Game benchmark identifiers are not unique.');
  if (document.querySelector('#capability-category-games')?.tagName !== 'BUTTON' || document.querySelector('#capability-category-games')?.getAttribute('aria-selected') !== 'true') failures.push('Games is not the selected native category.');
  if (text(document.querySelector('#capability-question')) !== 'Games' || !text(document.querySelector('.capability-canvas__status')).includes('Games v1 pilot')) failures.push('Games category header is missing.');
  if (reports.length === 1) {
    const report = reports[0];
    for (const condition of report.conditions) {
      const candidates = report.runs.filter(run => run.conditionId === condition.id && score(run) !== null && run.score.eligible === true).sort((a,b) => score(b)-score(a));
      const leader = candidates[0];
      const reading = document.querySelector(`[data-game-leader-condition="${CSS.escape(condition.id)}"]`);
      if (!visible(reading) || reading.dataset.gameLeaderScore !== String(score(leader) ?? '') || reading.dataset.gameLeaderRun !== (leader?.id || '')) failures.push('Games header omits or misstates its condition leader: ' + condition.id);
      if (leader && !text(reading).includes(score(leader).toFixed(1))) failures.push('Games header score is not visibly populated: ' + condition.id);
    }
  }
  if (document.querySelector('iframe, video')) failures.push('Homepage unexpectedly activates a game or recording.');
  const checkMode = async mode => {
    document.querySelector(`[data-capability-mode="${mode}"]`)?.click();
    await settle();
    if (location.pathname !== pathname || location.hash !== '#capabilities/games' + (mode === 'models' ? '' : '/' + mode)) failures.push('Games mode navigated away or has an incorrect route: ' + mode);
    if (document.querySelector('.capability-mode__tab[aria-selected="true"]')?.dataset.capabilityMode !== mode) failures.push('Games selected mode mismatch: ' + mode);
    const panel = document.querySelector(mode === 'models' ? '#capability-ranking' : mode === 'benchmarks' ? '#capability-benchmarks' : '#capability-efficiency');
    if (!visible(panel)) failures.push('Games panel is not visible: ' + mode);
    if (mode === 'models') {
      if (text(document.querySelector('#capability-mode-models strong')) !== 'Leaderboard') failures.push('Games does not use the shared Leaderboard tab label.');
      for (const report of reports) {
        const findTask = () => document.querySelector(`#capability-ranking [data-game-benchmark-id="${CSS.escape(report.benchmark.id)}"]`);
        const task = findTask();
        if (!task || task.querySelectorAll('[data-game-configuration]').length !== report.configurations.length) failures.push('Games model rows do not preserve every configuration: ' + report.benchmark.id);
        if (text(task?.querySelector('.capability-ranking__scale-values')).replace(/\s/g, '') !== '0255075100') failures.push('Games comparison does not expose the shared 0–100 scale.');
        for (const configuration of report.configurations) {
          const row = findTask()?.querySelector(`[data-game-configuration="${CSS.escape(configuration.id)}"]`);
          const pair = report.conditions.map(condition => report.runs.find(run => run.configurationId === configuration.id && run.conditionId === condition.id));
          const select = row?.querySelector('[data-game-select]');
          if (!visible(select) || select.getBoundingClientRect().height > (innerWidth > 1080 ? 84 : 132)) failures.push('Games model row does not preserve compact leaderboard density: ' + configuration.id);
          const track = row?.querySelector('.capability-rank-row__track');
          const bounds = track?.getBoundingClientRect();
          for (let index = 0; index < pair.length; index++) {
            const run = pair[index];
            if (!run) { failures.push('Game configuration lacks a published condition: ' + configuration.id); continue; }
            const expectedRank = score(run) === null || run.score.eligible !== true ? null : 1 + report.runs.filter(other => other.conditionId === run.conditionId && score(other) !== null && other.score.eligible === true && score(other) > score(run)).length;
            const reading = row?.querySelector(`[data-game-run-id="${CSS.escape(run.id)}"]`);
            if (reading?.dataset.gameRank !== String(expectedRank ?? '')) failures.push('Game condition rank differs from published score order: ' + run.id);
            if (expectedRank !== null && text(reading?.querySelector('small')) !== '#' + expectedRank) failures.push('Game condition rank is not visibly populated: ' + run.id);
            if (index === 1 && (row?.dataset.gameRank !== String(expectedRank ?? '') || expectedRank !== null && text(row.querySelector('.capability-rank-row__position')) !== '#' + String(expectedRank).padStart(2, '0'))) failures.push('Game model rank differs from its Vasir score rank: ' + run.id);
            checkReading(row?.querySelector(`[data-game-run-id="${CSS.escape(run.id)}"]`), run);
            if (displayScore(run) === null) continue;
            const marker = track?.querySelector(index === 0 ? '.capability-rank-row__marker--baseline' : '.capability-rank-row__marker--full');
            const mark = marker?.getBoundingClientRect();
            if (!visible(marker) || !bounds?.width || Math.abs(mark.left + mark.width / 2 - bounds.left - bounds.width * displayScore(run) / 100) > 2) failures.push('Game score marker does not align with its visible rating: ' + run.id);
          }
          const expectedDelta = pair.length === 2 && pair.every(run => score(run) !== null) ? score(pair[1]) - score(pair[0]) : null;
          if (row?.dataset.gameDelta !== String(expectedDelta ?? '')) failures.push('Games paired delta differs from complete-panel evidence: ' + configuration.id);
          select?.click();
          await settle();
          const selected = findTask()?.querySelector(`[data-game-configuration="${CSS.escape(configuration.id)}"] [data-game-select]`);
          if (selected?.getAttribute('aria-pressed') !== 'true') failures.push('Game leaderboard row selection is not exposed: ' + configuration.id);
          const href = findTask()?.querySelector('[data-game-selected-report]')?.href;
          if (!href || new URL(href).searchParams.get('benchmark') !== report.benchmark.id || new URL(href).searchParams.get('model') !== configuration.id) failures.push('Game model link loses benchmark/configuration: ' + configuration.id);
        }
        if (findTask()?.querySelector('[data-game-reference], .game-capability__reference-heading') || /human.directed example/i.test(text(findTask()))) failures.push('Games retains a separate human-directed reference row.');
        if (!text(findTask()?.querySelector('.capability-ranking__axis')).includes('Score Δ')) failures.push('Games score difference is not labeled as descriptive scores.');
        const rankedRows = [...findTask().querySelectorAll('[data-game-configuration]')].map(row => Number(row.dataset.gameRank)).filter(rank => rank > 0);
        if (rankedRows.some((rank,index) => index > 0 && rank < rankedRows[index-1])) failures.push('Games leaderboard is not sorted by its displayed ranks.');
        findTask()?.querySelector('[data-game-configuration] [data-game-select]')?.click();
        await settle();
      }
    }
    if (mode === 'benchmarks') {
      const links = [...panel.querySelectorAll('[data-game-report-link]')];
      if (links.length !== reports.length) failures.push('Games benchmark list count differs from collection.');
      for (const report of reports) {
        const link = links.find(item => item.dataset.benchmarkId === report.benchmark.id);
        if (!link || new URL(link.href).searchParams.get('benchmark') !== report.benchmark.id || !new URL(link.href).pathname.endsWith('/games.html')) failures.push('Game benchmark does not open its own report: ' + report.benchmark.id);
      }
    }
    if (mode === 'efficiency') {
      for (const report of reports) {
        const findTask = () => document.querySelector(`[data-game-efficiency-benchmark="${CSS.escape(report.benchmark.id)}"]`);
        const plotted = report.runs.filter(run => Number.isFinite(run.metrics?.durationMs) && run.metrics.durationMs > 0 && displayScore(run) !== null);
        if (findTask()?.querySelectorAll('[data-game-effort-run]').length !== plotted.length) failures.push('Game efficiency omits assessable timed runs.');
        if (findTask()?.querySelectorAll('[data-game-efficiency-entry] option').length !== report.runs.length) failures.push('Efficiency result selector omits submitted runs.');
        const maximum = Math.max(60, ...report.runs.map(run => (run.metrics?.durationMs || 0) / 60000));
        for (const run of plotted) {
          const point = findTask()?.querySelector(`[data-game-effort-run="${CSS.escape(run.id)}"]`);
          if (!point || point.dataset.gameDurationMs !== String(run.metrics.durationMs) || point.dataset.gameDisplayScore !== String(displayScore(run))) failures.push('Game efficiency point differs from observed evidence: ' + run.id);
          if (run.status === 'timeout' && !point?.getAttribute('aria-label')?.includes('Generation limit reached')) failures.push('Timeout is presented as completed generation: ' + run.id);
          const plane = findTask()?.querySelector('[data-game-plot]')?.getBoundingClientRect();
          const mark = point?.getBoundingClientRect();
          if (!visible(point) || !plane?.width || Math.abs(mark.left + mark.width / 2 - plane.left - plane.width * (run.metrics.durationMs / 60000) / maximum) > 2 || Math.abs(mark.top + mark.height / 2 - plane.top - plane.height * (100 - displayScore(run)) / 100) > 2) failures.push('Game efficiency point is not on its score/time coordinates: ' + run.id);
          point?.click();
          await settle();
          const summary = findTask()?.querySelector('[data-game-selected-run]');
          if (!visible(summary) || summary.dataset.gameSelectedRun !== run.id) failures.push('Efficiency point does not select its result: ' + run.id);
          checkReading(summary?.querySelector('[data-game-run-id]'), run);
          const href = summary?.querySelector('[data-game-selected-report]')?.href;
          if (!href || new URL(href).searchParams.get('benchmark') !== report.benchmark.id || new URL(href).searchParams.get('model') !== run.configurationId) failures.push('Efficiency selection loses its report: ' + run.id);
          if (run.status === 'timeout' && !text(summary).includes('Generation limit reached')) failures.push('Selected timeout hides its generation status: ' + run.id);
        }
        const first = report.runs.find(run => run.conditionId === report.conditions[1]?.id) || report.runs[0];
        const select = findTask()?.querySelector('[data-game-efficiency-entry]');
        if (select && first) { select.value = first.id; select.dispatchEvent(new Event('change', { bubbles: true })); await settle(); }
      }
    }
    if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Games has horizontal page overflow: ' + mode);
  };
  for (const mode of modes) await checkMode(mode);
  // Same-document history must restore both the route and visible tab panel.
  if (modes.includes('efficiency')) {
    const visitHistory = async direction => {
      const changed = new Promise(resolve => addEventListener('popstate', resolve, { once: true }));
      history[direction]();
      await Promise.race([changed, new Promise((_, reject) => setTimeout(() => reject(new Error('Games history did not navigate')), 3000))]);
      await settle();
    };
    await visitHistory('back');
    if (location.hash !== '#capabilities/games/benchmarks' || !visible(document.querySelector('#capability-benchmarks'))) failures.push('Games Back does not restore benchmark tab.');
    await visitHistory('forward');
    if (location.hash !== '#capabilities/games/efficiency' || !visible(document.querySelector('#capability-efficiency'))) failures.push('Games Forward does not restore efficiency tab.');
  }
  await checkMode(requestedMode);
  return { failures, categoryCount: 1, benchmarkCount: reports.length, settingCount: new Set(runs.map(run => run.configurationId)).size, entryCount: runs.length, resultCount: runs.length, d3Version: window.d3?.version };
}

// Serialized into the page with the independently derived, original-source
// category readings. Missing leaves must never become partial category means.
async function auditOverallAvailableProfiles(sourceOracle) {
  const failures = [];
  const text = node => node?.textContent.replace(/\s+/g, ' ').trim() || '';
  const visible = node => !!node && node.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }) && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
  const close = (a, b, tolerance = 1e-8) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
  const formatted = value => (Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value)) * 2) * 10) / 10).toFixed(1);
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const records = sourceOracle.coverage.records;
  const all = records.filter(record => !record.eligible);
  if (document.querySelector('[data-overall-coverage-display="coverage-summary-v1"]')) {
    const providers = [...new Set(records.map(record => record.provider))].sort();
    const filter = document.querySelector('#overall-model-provider');
    if (!visible(filter) || filter.value !== 'all' || JSON.stringify([...filter.options].map(option => option.value)) !== JSON.stringify(['all', ...providers])) failures.push('Overall provider filter must default to all registered source providers.');
    const within = (node, bounds) => {
      const box = node.getBoundingClientRect();
      return box.left >= bounds.left - 1 && box.right <= bounds.right + 1 && node.scrollWidth <= node.clientWidth + 1;
    };
    const inspectSummary = async wanted => {
      const disclosure = document.querySelector('#overall-available');
      const rows = [...document.querySelectorAll('[data-incomplete-setting-id]')];
      if (rows.length !== wanted.length || new Set(rows.map(row => row.dataset.incompleteSettingId)).size !== wanted.length) failures.push('Coverage summary omits or duplicates source settings.');
      if (!wanted.length) {
        if (disclosure) failures.push('Coverage summary exposes an empty disclosure.');
        return;
      }
      if (disclosure?.tagName !== 'DETAILS' || disclosure.dataset.overallCoverageDisplay !== 'coverage-summary-v1' || disclosure.dataset.incompleteCount !== String(wanted.length)) {
        failures.push('Coverage summary lacks its declared native disclosure or exact source count.');
        return;
      }
      const summary = disclosure.querySelector('summary');
      if (!visible(summary) || disclosure.open || rows.some(visible)) failures.push('Coverage summary must start closed with its rows hidden.');
      if (!disclosure.open) summary?.click();
      await settle();
      try {
        if (!disclosure.open) failures.push('Coverage summary does not open through its summary control.');
        for (const record of wanted) {
          const row = rows.find(node => node.dataset.incompleteSettingId === record.id);
          if (!visible(row)) { failures.push('Opened coverage summary hides a source setting: ' + record.id); continue; }
          if (text(row.querySelector('.overall-coverage__identity strong')) !== record.family || text(row.querySelector('.overall-coverage__identity > span')) !== record.reasoning) failures.push('Coverage summary changes the model identity: ' + record.id);
          if (['baselineScore', 'skillScore', 'fullScore', 'baselineRank', 'skillRank', 'fullRank', 'delta', 'overallScore', 'overallRank'].some(key => Object.hasOwn(row.dataset, key)) || row.querySelector('.capability-composition, .setting-row__rank, .overall-coverage__uplift, [data-composite-exact-score], [data-overall-score], [data-overall-rank]')) failures.push('Coverage summary invents an Overall total, rank or uplift: ' + record.id);
          const expected = sourceOracle.availableCategoriesBySetting[record.id];
          const links = [...row.querySelectorAll('[data-overall-category]')];
          if (!expected || links.length !== expected.length || new Set(links.map(link => link.dataset.overallCategory)).size !== expected.length) {
            failures.push('Coverage summary loses or duplicates an independently derived category: ' + record.id);
            continue;
          }
          for (const reading of expected) {
            const link = links.find(node => node.dataset.overallCategory === reading.categoryId);
            if (!visible(link) || link.tagName !== 'A') { failures.push('Coverage category is not a visible link: ' + record.id + '-' + reading.categoryId); continue; }
            if (link.dataset.categoryComplete !== String(reading.complete) || link.dataset.availableTests !== reading.available + '/' + reading.expected) failures.push('Coverage category changes complete paired source coverage: ' + record.id + '-' + reading.categoryId);
            for (const condition of ['baseline', 'skill']) {
              const raw = link.dataset[condition === 'baseline' ? 'categoryExactBaseline' : 'categoryExactSkill'];
              const actualScore = raw === 'null' ? null : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
              const score = reading.scores[condition];
              if (score === null ? actualScore !== null : !close(actualScore, score)) failures.push('Coverage category differs from exact paired original-source scores: ' + record.id + '-' + condition + '-' + reading.categoryId);
            }
            const label = reading.complete ? 'Plain ' + formatted(reading.scores.baseline) + ' → Skill ' + formatted(reading.scores.skill) : reading.available + '/' + reading.expected + ' tests scored';
            if (text(link.querySelector('span:last-child')) !== label) failures.push('Coverage category displays a fabricated or incorrect paired result: ' + record.id + '-' + reading.categoryId);
            try {
              const url = new URL(link.href, location.href);
              if (url.origin !== location.origin || url.pathname !== new URL('./index.html', location.href).pathname || url.hash !== '#capabilities/' + reading.categoryId || url.searchParams.get('setting') !== reading.configurationId || url.searchParams.get('inspect') !== '1' || (reading.categoryId === 'writing' && url.searchParams.get('score') !== 'all-writing')) failures.push('Coverage category link loses original source identity: ' + record.id + '-' + reading.categoryId);
            } catch { failures.push('Coverage category has an invalid source link: ' + record.id + '-' + reading.categoryId); }
            if (!within(link, row.getBoundingClientRect())) failures.push('Coverage category overflows its compact row: ' + record.id + '-' + reading.categoryId);
          }
          if (!within(row, { left: 0, right: innerWidth })) failures.push('Coverage row overflows the viewport: ' + record.id);
        }
        if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Opened coverage summary has horizontal page overflow.');
      } finally {
        if (disclosure.open) summary?.click();
        await settle();
        if (disclosure.open || rows.some(visible)) failures.push('Coverage summary did not restore its closed state.');
      }
    };
    try {
      await inspectSummary(all);
      for (const provider of providers) {
        const select = document.querySelector('#overall-model-provider');
        if (!select) { failures.push('Overall provider filter disappeared.'); break; }
        select.value = provider; select.dispatchEvent(new Event('change', { bubbles: true })); await settle();
        if (document.querySelector('#overall-model-provider')?.value !== provider) failures.push('Overall provider filter selection did not persist: ' + provider);
        const ranked = [...document.querySelectorAll('.result-list > .setting-row')];
        const expectedRanked = records.filter(record => record.eligible && record.provider === provider);
        if (ranked.length !== Math.min(10, expectedRanked.length) || new Set(ranked.map(row => row.dataset.settingId)).size !== ranked.length || ranked.some(row => !expectedRanked.some(record => record.id === row.dataset.settingId))) failures.push('Overall provider filter invents or omits ranked models: ' + provider);
        await inspectSummary(all.filter(record => record.provider === provider));
      }
    } finally {
      const reset = document.querySelector('#overall-model-provider');
      if (reset) { reset.value = 'all'; reset.dispatchEvent(new Event('change', { bubbles: true })); await settle(); }
      if (document.querySelector('#overall-model-provider')?.value !== 'all') failures.push('Overall provider filter did not restore all source providers.');
      await inspectSummary(all);
    }
    return { display: 'coverage-summary-v1', incompleteSettings: all.length, claudeSettings: all.filter(record => record.provider === 'claude').length, failures };
  }
  const inspect = async (wanted, auditDetails) => {
    const rows = [...document.querySelectorAll('[data-incomplete-setting-id]')];
    if (rows.length !== wanted.length || new Set(rows.map(row => row.dataset.incompleteSettingId)).size !== wanted.length) failures.push('Available category profiles omit or duplicate source settings.');
    for (const record of wanted) {
      const row = rows.find(row => row.dataset.incompleteSettingId === record.id);
      if (!visible(row)) { failures.push('Available category profile is not visible: ' + record.id); continue; }
      if (['baselineScore', 'fullScore', 'baselineRank', 'fullRank', 'delta'].some(key => row.dataset[key] !== 'null') || text(row.querySelector('.setting-row__rank')) !== '—' || text(row.querySelector('.overall-coverage__uplift strong')) !== '—') failures.push('Available category profile invents an Overall score or rank: ' + record.id);
      const expected = sourceOracle.availableCategoriesBySetting[record.id];
      if (!expected || row.querySelectorAll('[data-coverage-condition]').length !== 2) { failures.push('Available category profile lacks both independently derived conditions: ' + record.id); continue; }
      for (const condition of ['baseline', 'skill']) {
        const profile = row.querySelector('[data-coverage-condition="' + condition + '"]');
        if (!visible(profile) || text(profile.querySelector('.capability-composition__total')) !== '—' || profile.querySelector('.capability-composition__rank')) failures.push('Available profile has a numeric total/rank: ' + record.id + '-' + condition);
        const stack = profile?.querySelector('.capability-composition__stack');
        const segments = [...(profile?.querySelectorAll('[data-overall-category]') || [])];
        if (segments.length !== expected.length || new Set(segments.map(segment => segment.dataset.overallCategory)).size !== expected.length) failures.push('Available profile loses a category: ' + record.id);
        for (const reading of expected) {
          const segment = segments.find(segment => segment.dataset.overallCategory === reading.categoryId);
          if (!visible(segment)) { failures.push('Available category is hidden: ' + record.id + '-' + reading.categoryId); continue; }
          const score = reading.scores[condition];
          const actualScore = segment.dataset.categoryExactScore === 'null' ? null : Number(segment.dataset.categoryExactScore);
          if (segment.dataset.categoryComplete !== String(reading.complete) || (score === null ? actualScore !== null : !close(actualScore, score)) || !close(Number(segment.dataset.categoryWeight), reading.weight) || segment.dataset.availableTests !== reading.available + '/' + reading.expected) failures.push('Available category differs from complete paired original-source scores: ' + record.id + '-' + condition + '-' + reading.categoryId);
          if (text(segment.querySelector('.capability-composition__score')) !== (score === null ? '—' : formatted(score)) || segment.classList.contains('overall-category-slot--missing') !== !reading.complete) failures.push('Available category score/missing treatment differs from source: ' + record.id + '-' + reading.categoryId);
          const slotWidth = segment.getBoundingClientRect().width;
          if (!close(parseFloat(segment.style.getPropertyValue('--segment-width')), reading.weight * 100) || !close(parseFloat(segment.style.getPropertyValue('--category-fill')), score ?? 0) || !close(slotWidth, stack.getBoundingClientRect().width * reading.weight, 1.25) || !close(parseFloat(getComputedStyle(segment, '::before').width), slotWidth * (score ?? 0) / 100, 1.25)) failures.push('Available category geometry changes fixed weight or exact score: ' + record.id + '-' + reading.categoryId);
          const url = new URL(segment.href, location.href);
          if (url.origin !== location.origin || url.pathname !== new URL('./index.html', location.href).pathname || url.hash !== '#capabilities/' + reading.categoryId || url.searchParams.get('setting') !== reading.configurationId || (reading.categoryId === 'writing' && url.searchParams.get('score') !== 'all-writing')) failures.push('Available category link loses original source identity: ' + record.id + '-' + reading.categoryId);
        }
      }
      if (auditDetails) {
        const details = row.querySelector('details.overall-coverage__details');
        const links = [...row.querySelectorAll('[data-missing-task-id]')];
        const missing = ['missingTaskIds', 'unassessableTaskIds'].flatMap(field => [...new Set(['baseline', 'skill'].flatMap(condition => record.conditions[condition][field]))]);
        if (!details || details.open || links.some(visible)) failures.push('Missing-test evidence is not initially closed: ' + record.id);
        details?.querySelector('summary')?.click();
        await settle();
        if (!details?.open || links.length !== missing.length || missing.some(id => !links.some(link => link.dataset.missingTaskId === id)) || links.some(link => !visible(link) || new URL(link.href, location.href).href !== new URL('./benchmark-report.html?from=overall#' + link.dataset.missingTaskId, location.href).href)) failures.push('Opened missing-test evidence loses original reports: ' + record.id);
        details?.querySelector('summary')?.click();
        await settle();
        if (details?.open || links.some(visible)) failures.push('Missing-test evidence did not close after audit: ' + record.id);
      }
    }
  };
  const filter = document.querySelector('#overall-model-provider');
  const expectedOptions = ['all', ...[...new Set(records.map(record => record.provider))].sort()];
  if (!visible(filter) || filter.value !== 'all' || JSON.stringify([...filter.options].map(option => option.value)) !== JSON.stringify(expectedOptions)) failures.push('Overall provider filter must default to all registered source providers.');
  await inspect(all, true);
  const claude = all.filter(record => record.provider === 'claude');
  if (!claude.length) failures.push('Claude filter fixture has no incomplete source models.');
  if (filter) {
    filter.value = 'claude'; filter.dispatchEvent(new Event('change', { bubbles: true })); await settle();
    if (document.querySelector('#overall-model-provider')?.value !== 'claude') failures.push('Claude provider filter selection did not persist.');
    const ranked = [...document.querySelectorAll('.result-list > .setting-row')];
    const expectedRanked = records.filter(record => record.eligible && record.provider === 'claude');
    if (ranked.length !== Math.min(10, expectedRanked.length) || ranked.some(row => !expectedRanked.some(record => record.id === row.dataset.settingId))) failures.push('Claude provider filter invents or omits ranked models.');
    await inspect(claude, false);
    const reset = document.querySelector('#overall-model-provider');
    reset.value = 'all'; reset.dispatchEvent(new Event('change', { bubbles: true })); await settle();
    if (document.querySelector('#overall-model-provider')?.value !== 'all' || document.querySelectorAll('[data-incomplete-setting-id]').length !== all.length) failures.push('Overall provider filter did not restore the complete source roster.');
  }
  return { display: 'category-profiles-v1', incompleteSettings: all.length, claudeSettings: claude.length, failures };
}

async function auditOverall(target, sourceOracle = null, inspectAvailableProfiles = null) {
  const root = window.VASIR_DATA;
  const data = root?.overall;
  const sources = [root, root?.aiWorkflows].filter(Boolean);
  const failures = [];
  const text = element => element?.textContent.replace(/\s+/g, ' ').trim() || '';
  const primaryText = element => [...(element?.childNodes || [])].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
  const visible = element => Boolean(element && element.getBoundingClientRect().width && element.getBoundingClientRect().height && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const close = (a, b, tolerance = 0.000001) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
  const exactClose = (a, b) => close(a, b, 32 * Number.EPSILON * Math.max(1, Math.abs(b)));
  const rounded = value => sourceOracle ? Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value)) * 2) * 10) / 10 : Number(value.toFixed(1));
  const number = value => Number(String(value).replaceAll('−', '-').match(/-?\d+(?:\.\d+)?/)?.[0]);
  const taskScore = cell => cell && (Object.hasOwn(cell, 'exactScore') ? cell.exactScore : cell.score);
  if (!data) return {failures: ['Overall projection missing.']};
  const isV3 = data.scoreBasis?.edition === 'overall-v3';
  if (isV3 !== !!sourceOracle || sourceOracle && (sourceOracle.edition !== 'overall-v3' || !sourceOracle.sourceScoreVerified)) return {failures: ['Overall edition has no matching independently verified original-source oracle.']};
  const editionLabel = isV3 ? 'Overall v3' : 'Overall v2';
  const tasks = sourceOracle ? sourceOracle.benchmarks : sources.flatMap(source => source.benchmarks);
  const cells = sourceOracle ? sourceOracle.sourceCells.map(cell => ({...cell, exactScore: cell.value})) : sources.flatMap(source => source.benchmarkResults);
  // Independent policy oracle: declared category priorities, normalized only across published categories.
  const priorities = new Map([['engineering', 0.25], ['games', 0.25], ['writing', 0.125], ['product-design', 0.25], ['ai-workflows', 0.125]]);
  const measuredCategories = [...new Set(tasks.map(task => task.category))];
  const publishedTargetWeight = measuredCategories.reduce((sum, category) => sum + priorities.get(category), 0);
  const categoryWeight = category => priorities.get(category) / publishedTargetWeight;
  const identities = sourceOracle ? sourceOracle.coverage.records : [...new Map(sources.flatMap(source => source.settings).map(setting => [setting.id, setting])).values()];
  const cellFor = (id, condition, task) => cells.find(cell => cell.settingId === id && cell.condition === condition && cell.benchmarkId === task);
  const complete = identities.filter(setting => ['baseline', 'skill'].every(condition => tasks.every(task => Number.isFinite(taskScore(cellFor(setting.id, condition, task.id))))));
  const incomplete = identities.filter(setting => !complete.some(candidate => candidate.id === setting.id));
  const sourceMean = (id, condition, valueFor, category) => {
    if (category) {
      const selectedTasks = tasks.filter(task => task.category === category);
      return selectedTasks.reduce((sum, task) => sum + valueFor(cellFor(id, condition, task.id)), 0) / selectedTasks.length;
    }
    return measuredCategories.reduce((sum, family) => sum + sourceMean(id, condition, valueFor, family) * priorities.get(family), 0) / publishedTargetWeight;
  };
  const sourceScore = (id, condition, category) => sourceOracle ? (() => {const entry = sourceOracle.entries.find(entry => entry.settingId === id && entry.condition === condition); return category ? entry?.categories.find(component => component.category === category)?.exactScore : entry?.exactScore;})() : sourceMean(id, condition, taskScore, category);
  const expected = new Map(sourceOracle ? sourceOracle.entries.map(entry => [entry.id, entry]) : complete.flatMap(setting => ['baseline', 'skill'].map(condition => {
    const exactScore = sourceScore(setting.id, condition);
    const baseline = sourceScore(setting.id, 'baseline');
    const meanResource = field => sourceMean(setting.id, condition, cell => cell[field]);
    const metrics = {
      sampleCount: tasks.length,
      meanLatencyMs: meanResource('latencyMs'),
      meanInputTokens: meanResource('inputTokens'),
      meanOutputTokens: meanResource('outputTokens'),
      meanTotalTokens: meanResource('totalTokens'),
      costUsd: null
    };
    return [setting.id + '-' + condition, {
      id: setting.id + '-' + condition, settingId: setting.id, condition,
      exactScore, score: rounded(exactScore), exactDelta: condition === 'skill' ? exactScore - baseline : 0,
      latency: metrics.meanLatencyMs / 1000, tokens: metrics.meanOutputTokens, metrics
    }];
  })));
  const rank = entry => 1 + [...expected.values()].filter(other => other.condition === entry.condition && other.exactScore > entry.exactScore).length;
  const expectedSkill = [...expected.values()].filter(entry => entry.condition === 'skill').sort((a, b) => b.exactScore - a.exactScore || a.latency - b.latency || a.id.localeCompare(b.id));
  if (!isV3 && (tasks.length !== 4 || new Set(tasks.map(task => task.category)).size !== 2 || cells.length !== 268 || complete.length !== 26 || incomplete.length !== 10)) failures.push('Frozen legacy source task/cohort coverage changed.');
  if (data.scoreBasis?.label !== editionLabel || data.scoreBasis?.edition !== (isV3 ? 'overall-v3' : 'overall-v2') || data.scoreBasis?.method !== 'priority-weighted-published-category-mean-v1' || data.scoreBasis?.benchmarkWeighting !== (isV3 ? 'declared-within-category' : 'equal-within-category') || data.scoreBasis?.categoryWeighting !== 'declared-priority-normalized-over-published-v1' || data.scoreBasis?.taskCount !== tasks.length) failures.push('Overall edition or category-priority weighting missing.');
  if (data.scoreBasis?.portfolioCategoryCount !== priorities.size || data.scoreBasis?.publishedTargetWeight !== publishedTargetWeight || publishedTargetWeight !== (isV3 ? 0.5 : 0.375)) failures.push('Overall target-weight coverage differs from independently declared category priorities.');
  if (isV3 && (JSON.stringify(measuredCategories) !== JSON.stringify(['engineering','writing','ai-workflows']) || data.scoreBasis.benchmarkWeights.some(task => !exactClose(task.weight, sourceOracle.benchmarkWeights[task.benchmarkId])))) failures.push('Overall nested Writing task weights differ from the original source catalog.');
  if (data.portfolioCategories?.map(category => category.id).join('|') !== [...priorities.keys()].join('|')) failures.push('Overall omits or reorders the five-category target policy.');
  for (const [id, targetWeight] of priorities) {
    const category = data.portfolioCategories?.find(category => category.id === id);
    const categoryTasks = tasks.filter(task => task.category === id);
    if (!category || category.targetWeight !== targetWeight || !exactClose(category.weight, categoryTasks.length ? categoryWeight(id) : 0) || category.taskCount !== categoryTasks.length || category.status !== (categoryTasks.length ? 'measured' : 'coming-soon') || category.benchmarkIds?.join('|') !== categoryTasks.map(task => task.id).join('|')) failures.push('Overall category policy or measurement status differs from source coverage: ' + id);
  }
  if (data.conditions?.find(condition => condition.id === 'skill')?.label !== 'Task-specific skill') failures.push('Overall skill condition conceals task-specific treatments.');
  if (data.entries.length !== expected.size || data.settings.length !== complete.length || data.benchmarkResults.length !== cells.length) failures.push('Overall cohort or source-cell counts mismatch.');
  for (const category of data.categories) {
    if (!exactClose(category.weight, categoryWeight(category.id)) || category.targetWeight !== priorities.get(category.id)) failures.push('Overall family weight does not follow normalized category priorities: ' + category.id);
  }
  for (const entry of data.entries) {
    const oracle = expected.get(entry.id);
    if (!oracle || !close(entry.exactScore, oracle.exactScore) || entry.score !== oracle.score || !close(entry.exactDelta, oracle.exactDelta)) failures.push('Overall entry differs from saved final task scores: ' + entry.id);
    const resourceMatches = (actual, wanted) => wanted === null ? actual === null : exactClose(actual, wanted);
    if (!oracle || !resourceMatches(entry.latency, oracle.latency) || !resourceMatches(entry.tokens, oracle.tokens) || Object.entries(oracle.metrics).some(([key, value]) => key === 'sampleCount' || value === null ? entry.metrics?.[key] !== value : !exactClose(entry.metrics?.[key], value))) failures.push('Overall resources differ from exact category-weighted source means: ' + entry.id);
  }
  if (data.coverage?.totalSettings !== identities.length || data.coverage?.eligibleSettings !== complete.length || data.coverage?.incompleteSettings !== incomplete.length || data.coverage?.observedResponseCount !== cells.length) failures.push('Overall coverage summary differs from source evidence.');
  for (const setting of incomplete) {
    const record = data.coverage?.records.find(record => record.id === setting.id);
    if (!record || record.eligible || ['baseline', 'skill'].some(condition => record.scores?.[condition] !== null || record.exactScores?.[condition] !== null || record.ranks?.[condition] !== null || record.metrics?.[condition] !== null) || record.deltas?.skill !== null || record.exactDeltas?.skill !== null) failures.push('Incomplete setting acquired an Overall score, rank, uplift, or resource mean: ' + setting.id);
  }

  const documentAudit = mode => {
    if (document.querySelector('.capability-selector__tab[aria-selected="true"]')?.dataset.categoryId !== 'overall') failures.push('Overall selection lost in ' + mode);
    if (text(document.querySelector('#capability-question')) !== 'Overall') failures.push('Overall heading mismatch.');
    const editionDisclosure = text(document.querySelector('.capability-canvas__status')) + ' ' + text(document.querySelector('.benchmark-mast__evidence'));
    if (!editionDisclosure.includes(editionLabel)) failures.push('Overall edition disclosure missing.');
    const method = document.querySelector('[data-overall-method]');
    const coverage = document.querySelector('[data-portfolio-coverage]');
    const methodTokens = isV3 ? ['Engineering', '50%', 'Writing', '25%', 'AI Workflows'] : ['Engineering', '66.7%', 'AI Workflows', '33.3%'];
    if (!visible(method) || !methodTokens.every(value => text(method).includes(value))) failures.push('Overall current category weights are not visible.');
    if (!visible(coverage) || !text(coverage).includes(measuredCategories.length + '/' + priorities.size) || !text(coverage).includes(publishedTargetWeight * 100 + '%') || !/target weight/i.test(text(coverage))) failures.push('Overall measured categories and target-weight coverage are not visibly distinguished.');
    if (/each benchmark\s+25%|equal[- ]weight(?:ed)? across all/i.test(text(method) + ' ' + document.querySelector('#capability-category-overall')?.getAttribute('aria-label'))) failures.push('Overall still claims equal weights across all benchmark tasks.');
    if (Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1) failures.push('Overall ' + mode + ' overflows viewport.');
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    if (new Set(ids).size !== ids.length) failures.push('Overall contains duplicate element IDs.');
    for (const control of [...document.querySelectorAll('button, a[href], summary, select')].filter(visible)) {
      if (!text(control) && !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby') && !control.labels?.length) failures.push('Overall contains unnamed control.');
    }
  };
  const route = async mode => {
    location.hash = 'capabilities/overall' + (mode === 'models' ? '' : '/' + mode);
    await settle();
    documentAudit(mode);
  };
  await route('models');
  if (!text(document.querySelector('.capability-canvas__identity')).includes(String(tasks.length))) failures.push('Overall task scope missing.');
  if (isV3 && /×\s*1\s*trial/i.test(text(document.querySelector('.capability-canvas__identity')) + ' ' + text(document.querySelector('.capability-canvas__status')))) failures.push('Overall v3 falsely presents a uniform one-trial source protocol.');
  const weightsDisclosure = document.querySelector('details.overall-weights');
  if (!weightsDisclosure || weightsDisclosure.open) failures.push('Overall target-weight method must be available in a collapsed disclosure.');
  weightsDisclosure?.querySelector('summary')?.click();
  await settle();
  const weightRows = [...document.querySelectorAll('[data-target-category-id]')];
  if (!weightsDisclosure?.open || weightRows.length !== priorities.size) failures.push('Overall target-weight disclosure does not expose all five categories.');
  for (const [id, weight] of priorities) {
    const row = weightRows.find(row => row.dataset.targetCategoryId === id);
    if (!visible(row) || Number(row.dataset.targetWeight) !== weight || !text(row).includes(weight * 100 + '%')) failures.push('Overall target-weight disclosure differs from declared policy: ' + id);
  }
  weightsDisclosure?.querySelector('summary')?.click();
  await settle();
  const inspectRows = () => {
    const rows = [...document.querySelectorAll('.result-list > .setting-row')].filter(visible);
    rows.forEach((row, index) => {
      const skill = expectedSkill[index];
      const baseline = expected.get(skill?.settingId + '-baseline');
      if (!skill || !baseline || row.dataset.settingId !== skill.settingId) { failures.push('Overall leaderboard order mismatch.'); return; }
      if (Number(row.dataset.fullScore) !== skill.score || Number(row.dataset.baselineScore) !== baseline.score || Number(row.dataset.delta) !== rounded(skill.exactDelta)) failures.push('Overall row score or uplift mismatch: ' + skill.settingId);
      if (Number(row.dataset.fullRank) !== rank(skill) || Number(row.dataset.baselineRank) !== rank(baseline)) failures.push('Overall row competition rank mismatch: ' + skill.settingId);
      const compositions = [...row.querySelectorAll('.capability-composition')];
      if (compositions.length !== 2) failures.push('Overall does not show both conditions.');
      for (const composition of compositions) {
        const entry = expected.get(composition.dataset.entryId);
        if (!entry) { failures.push('Unknown Overall composition.'); continue; }
        if (!close(Number(composition.dataset.compositeExactScore), entry.exactScore) || number(text(composition.querySelector('.capability-composition__total'))) !== entry.score) failures.push('Overall visible total differs from exact aggregate.');
        const segments = [...composition.querySelectorAll('.capability-composition__segment')];
        if (segments.length !== measuredCategories.length || new Set(segments.map(segment => segment.dataset.categoryId)).size !== measuredCategories.length) failures.push('Overall bar omits or duplicates a category.');
        let total = 0;
        for (const segment of segments) {
          const family = segment.dataset.categoryId;
          const weight = categoryWeight(family);
          const exact = sourceScore(entry.settingId, entry.condition, family);
          const contribution = exact * weight;
          if (!close(Number(segment.dataset.weight), weight) || !close(Number(segment.dataset.rawExactScore), exact) || !close(Number(segment.dataset.contribution), contribution)) failures.push('Overall category contribution mismatch: ' + family);
          total += Number(segment.dataset.contribution);
          const stack = composition.querySelector('.capability-composition__stack');
          if (stack && !close(segment.getBoundingClientRect().width, stack.getBoundingClientRect().width * contribution / 100, 1.25)) failures.push('Overall bar width is not the weighted contribution.');
        }
        if (!close(total, entry.exactScore)) failures.push('Overall category contributions do not sum to the total.');
      }
    });
    return rows;
  };
  if (inspectRows().length !== Math.min(10, complete.length)) failures.push('Overall collapsed cohort is not top10.');
  document.querySelector('#show-all')?.click();
  await settle();
  if (inspectRows().length !== complete.length) failures.push('Overall expansion omits eligible settings.');
  const gaps = [...document.querySelectorAll('[data-incomplete-setting-id]')];
  const categoryProfiles = document.querySelector('[data-overall-coverage-display="category-profiles-v1"]');
  const coverageSummary = document.querySelector('[data-overall-coverage-display="coverage-summary-v1"]');
  if (gaps.length !== incomplete.length) failures.push('Overall omits incomplete settings.');
  for (const setting of incomplete) {
    const row = gaps.find(node => node.dataset.incompleteSettingId === setting.id);
    // The compact disclosure is audited while open below against both exact
    // category conditions. It intentionally has no per-row Overall readings.
    if (coverageSummary) continue;
    const missingTasks = tasks.filter(task => ['baseline', 'skill'].some(condition => !Number.isFinite(taskScore(cellFor(setting.id, condition, task.id)))));
    if (!visible(row) || !text(row).includes(setting.family) || missingTasks.some(task => !row.querySelector('[data-missing-task-id="' + task.id + '"]'))) failures.push('Incomplete coverage or recovery link missing: ' + setting.id);
    if (['baselineScore', 'fullScore', 'baselineRank', 'fullRank', 'delta'].some(key => row?.dataset[key] !== 'null')) failures.push('Incomplete row exposes a numeric Overall result: ' + setting.id);
    if (categoryProfiles) {
      for (const condition of ['baseline', 'skill']) if (row?.dataset[condition + 'Coverage'] !== tasks.filter(task => cellFor(setting.id, condition, task.id)).length + '/' + tasks.length) failures.push('Available category profiles change original source coverage: ' + setting.id);
      continue;
    }
    for (const condition of ['baseline', 'skill']) {
      const observed = tasks.filter(task => cellFor(setting.id, condition, task.id)).length;
      const assessable = tasks.filter(task => Number.isFinite(taskScore(cellFor(setting.id, condition, task.id)))).length;
      const reading = row?.querySelector('[data-coverage-condition="' + condition + '"]');
      const score = reading?.querySelector('strong');
      const rankLabel = score?.querySelector('small');
      const coverageText = observed + '/' + tasks.length + ' tasks' + (assessable !== observed ? ' · ' + assessable + ' assessable' : '');
      if (row?.dataset[condition + 'Coverage'] !== observed + '/' + tasks.length || !visible(reading) || !visible(score) || primaryText(score) !== '—' || !visible(rankLabel) || text(rankLabel) !== 'rank —' || text(reading?.querySelector('span:last-child')) !== coverageText) failures.push('Incomplete condition does not visibly preserve unavailable score/rank and source coverage: ' + setting.id + '-' + condition);
    }
    const uplift = row?.querySelector('.overall-coverage__uplift strong');
    if (!visible(uplift) || primaryText(uplift) !== '—') failures.push('Incomplete row shows an available Overall uplift: ' + setting.id);
  }
  if (categoryProfiles || coverageSummary) {
    if (!sourceOracle || !inspectAvailableProfiles) failures.push('Available category profiles have no independent source oracle.');
    else failures.push(...(await inspectAvailableProfiles(sourceOracle)).failures);
  }
  if ((!categoryProfiles && !coverageSummary) || document.querySelector('#show-all')?.getAttribute('aria-expanded') === 'true') document.querySelector('#show-all')?.click();
  await settle();

  await route('benchmarks');
  const ledgerRows = [...document.querySelectorAll('.benchmark-ledger__row[data-benchmark-id]')].filter(visible);
  if (ledgerRows.length !== tasks.length || document.querySelectorAll('.benchmark-ledger__track').length !== new Set(tasks.map(task => task.suite)).size) failures.push('Overall ledger omits a benchmark or track.');
  for (const task of tasks) {
    const row = ledgerRows.find(row => row.dataset.benchmarkId === task.id);
    const summary = (sourceOracle?.benchmarkSummaries || sources.flatMap(source => source.benchmarkSummaries)).find(summary => summary.benchmarkId === task.id);
    const expectedReportUrl = new URL('./benchmark-report.html?from=overall#' + task.id, location.href).href;
    if (!row || new URL(row.getAttribute('href'), location.href).href !== expectedReportUrl) failures.push('Overall report route missing: ' + task.id);
    const rendered = value => Number.isFinite(value) ? value : null;
    if (!summary || rendered(Number(row?.dataset.baselineScore)) !== summary.baseline || rendered(Number(row?.dataset.treatmentScore)) !== summary.treatment) failures.push('Overall ledger changes the source field means: ' + task.id);
    const display = sourceOracle?.benchmarkDisplays[task.id];
    if (display) {
      if (!text(row?.querySelector('.benchmark-ledger__evidence')).includes(display.settingCount + ' model settings') || Number(row?.dataset.writingSettingCount) !== display.settingCount || Number(row?.dataset.writingCaseCount) !== display.caseCount || Number(row?.dataset.writingTrialCount) !== display.trials || Number(row?.dataset.writingJudgeCount) !== display.judgeCount) failures.push('Overall Writing ledger changes original task metadata: ' + task.id);
    } else if (!text(row?.querySelector('.benchmark-ledger__evidence')).includes(summary.complete + '/' + summary.total)) failures.push('Overall ledger changes the source cohort: ' + task.id);
  }

  await route('efficiency');
  if (document.querySelector('#efficiency-entry')?.options.length !== expected.size) failures.push('Overall efficiency omits conditions or includes incomplete settings.');
  for (const metric of ['latency', 'tokens']) {
    const select = document.querySelector('#resource-axis');
    if (!select) { failures.push('Overall resource selector missing.'); break; }
    select.value = metric;
    select.dispatchEvent(new Event('change', {bubbles: true}));
    await settle();
    const points = [...document.querySelectorAll('[data-plot-point][data-entry-id]')].filter(visible);
    const available = [...expected.values()].filter(entry => Number.isFinite(entry[metric]) && entry[metric] > 0);
    if (points.length !== available.length) failures.push('Overall efficiency point count differs from available source resources.');
    // Resource switching animates point transforms for 220ms; inspect final geometry.
    await Promise.allSettled(points.flatMap(point => point.getAnimations().map(animation => animation.finished)));
    await settle();
    const values = available.map(entry => entry[metric]);
    const low = Math.min(...values) * 0.9;
    const high = Math.max(...values) * 1.1;
    const canvas = document.querySelector('.efficiency-plane__canvas');
    const plotBounds = canvas?.getBoundingClientRect();
    if (!visible(canvas)) failures.push('Overall efficiency plot has no rendered area.');
    for (const point of points) {
      const oracle = expected.get(point.dataset.entryId);
      if (!oracle || !Number.isFinite(oracle[metric]) || oracle[metric] <= 0) { failures.push('Overall efficiency has an unknown or source-unavailable point.'); continue; }
      const x = (Math.log(oracle[metric]) - Math.log(low)) / (Math.log(high) - Math.log(low)) * 100;
      const y = 100 - oracle.exactScore;
      if (Number(point.dataset.score) !== oracle.score || !exactClose(Number(point.dataset.resource), oracle[metric]) || !close(Number(point.dataset.plotX), x, 0.000501) || !close(Number(point.dataset.plotY), y, 0.000501)) failures.push('Overall efficiency values differ from exact category-weighted source means: ' + oracle.id);
      const pointBounds = point.getBoundingClientRect();
      // Percentage attributes round to three decimals; allow only browser pixel rounding here.
      if (!plotBounds || !close(pointBounds.left + pointBounds.width / 2, plotBounds.left + plotBounds.width * x / 100, 1) || !close(pointBounds.top + pointBounds.height / 2, plotBounds.top + plotBounds.height * y / 100, 1)) failures.push('Overall efficiency rendered point differs from the source-derived position: ' + JSON.stringify({id: oracle.id, metric, x, y, plotBounds, pointBounds}));
    }
    documentAudit('efficiency');
  }
  const resource = document.querySelector('#resource-axis');
  if (resource) { resource.value = 'latency'; resource.dispatchEvent(new Event('change', {bubbles: true})); await settle(); }
  await route(target === 'efficiency' ? 'efficiency' : 'models');
  window.scrollTo({top: 0, behavior: 'instant'});
  await settle();
  return {failures, edition: data.scoreBasis.edition, categoryCount: measuredCategories.length, benchmarkCount: tasks.length, settingCount: complete.length, entryCount: expected.size, resultCount: cells.length, originalWritingSource: sourceOracle?.originalWritingSource || null, categoryWeights: Object.fromEntries(measuredCategories.map(category => [category, categoryWeight(category)])), writingBenchmarkWeights: sourceOracle?.writingBenchmarkWeights || null, d3Version: window.d3?.version};
}

async function auditWorkflows(target) {
  const data = window.VASIR_DATA?.aiWorkflows;
  const responses = window.VASIR_RESPONSES?.aiWorkflows;
  const failures = [];
  const text = element => element?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const scoreText = value => Number.isFinite(value) ? value.toFixed(1) : 'Not assessable';
  const visible = element => Boolean(element?.getClientRects().length);
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  let disclosureReportHref = null;
  if (!data || data.benchmarks?.length !== 1 || data.benchmarks[0].id !== 'work-spec-chat') {
    return { failures: ['AI Workflows requires its real one-task projection.'] };
  }
  const weights = { V: 25, G: 15, A: 20, D: 15, S: 15, C: 10 };
  if (JSON.stringify(data.scoreBasis.weights) !== JSON.stringify(weights)
    || data.scoreBasis.taskCount !== 1 || data.scoreBasis.trialsPerTask !== 1
    || data.scoreBasis.calibrationStatus !== 'development-uncalibrated'
    || data.scoreBasis.judges.join('|') !== 'codex:gpt-6-astra@xhigh|claude:claude-fable-5-1@max'
    || data.scoreBasis.gates !== null || data.scoreBasis.caps !== null) failures.push('Work-spec rubric/panel contract mismatch.');
  if (data.entries.length !== data.settings.length * 2 || data.benchmarkResults.length !== data.entries.length) failures.push('Incomplete paired work-spec matrix.');
  const expectedRank = (settingId, condition) => {
    const cell = data.benchmarkResults.find(result => result.settingId === settingId && result.condition === condition);
    return Number.isFinite(cell?.exactScore)
      ? 1 + data.benchmarkResults.filter(result => result.condition === condition && result.exactScore > cell.exactScore).length
      : null;
  };
  const disclosureNode = document.querySelector('.capability-canvas__status, .evidence-truth');
  const disclosure = text(disclosureNode);
  if (!visible(disclosureNode) || !disclosure.includes('1 task × 1 trial · 2 judges')) failures.push('Single-case task/trial/judge disclosure missing.');
  const isWorkflowReport = target === 'workflow-report' || target === 'workflow-inspector';
  if (isWorkflowReport && !disclosure.includes('Uncalibrated development')) failures.push('Single-case uncalibrated disclosure missing from the work-spec report.');
  if (document.querySelector('.development-unavailable')) failures.push('Workflow renderer rejected the real data.');
  if (Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1) failures.push('Workflow page overflows horizontally.');
  if (text(document.querySelector('.capability-browser__canvas, .report-shell')).includes('Architecture skill')) failures.push('Engineering condition leaked into work-spec results.');

  if (isWorkflowReport) {
    if (!responses || responses.responses.length !== data.entries.length || responses.counts.judgments !== data.entries.length * 2) failures.push('Work-spec transcript matrix incomplete.');
    const rows = [...document.querySelectorAll('.model-preview__item')];
    if (rows.length !== data.settings.length) failures.push('Report omitted model settings.');
    const sorted = data.benchmarkResults.filter(result => result.condition === 'skill').sort((a, b) => (b.exactScore ?? -1) - (a.exactScore ?? -1)
      || (data.benchmarkResults.find(value => value.settingId === b.settingId && value.condition === 'baseline').exactScore ?? -1)
        - (data.benchmarkResults.find(value => value.settingId === a.settingId && value.condition === 'baseline').exactScore ?? -1)
      || data.settings.find(value => value.id === a.settingId).label.localeCompare(data.settings.find(value => value.id === b.settingId).label));
    rows.forEach((row, index) => {
      const expected = sorted[index];
      if (!expected) return;
      const setting = data.settings.find(value => value.id === expected.settingId);
      if (text(row.querySelector('.model-preview__identity strong')) !== setting.label) failures.push('Report ordering/identity mismatch.');
      const rank = expectedRank(setting.id, 'skill');
      const rankLabel = text(row.querySelector('.model-preview__identity small'));
      if (rank ? !rankLabel.includes('rank #' + rank + ' of ') : rankLabel !== 'Panel total not assessable') failures.push('Report does not preserve exact-score competition ranks.');
      if (row.querySelector('.model-run').open) failures.push('Full runs must start collapsed.');
      for (const condition of ['baseline', 'skill']) {
        const panel = row.querySelector('[data-condition="' + condition + '"]');
        const response = responses.responses.find(value => value.settingId === setting.id && value.condition === condition);
        const messages = responses.messageSets.find(value => value.id === response.messageSetId).messages;
        if (response.outputText.length ? panel.querySelector('[data-output-text] code')?.textContent !== response.outputText : !panel.querySelector('[data-output-absence]')) failures.push('Generated work spec or its explicit absence was changed.');
        const inputs = [...panel.querySelectorAll('[data-message-content] code')].map(node => node.textContent);
        if (JSON.stringify(inputs) !== JSON.stringify(messages.map(message => message.content))) failures.push('Effective prompt was changed, reordered, or truncated.');
        if (panel.querySelector('.model-run__prompt').open || panel.querySelector('.model-run__judging').open) failures.push('Prompt/judge disclosure must start collapsed.');
        if (text(panel.querySelector('[data-condition-readiness]')) !== response.readinessLabel) failures.push('Condition readiness mismatch.');
        if (text(row.querySelector('[data-summary-readiness="' + condition + '"]')) !== response.readinessLabel) failures.push('Collapsed row omits readiness.');
        const judges = [...panel.querySelectorAll('[data-judge-review]')];
        if (judges.length !== 2) failures.push('Independent judge missing.');
        judges.forEach((judgeNode, judgeIndex) => {
          const judge = response.judgments[judgeIndex];
          const score = judge.assessmentStatus !== 'assessable' || Object.values(judge.dimensions).some(dimension => dimension.rating === null) ? null
            : Object.entries(weights).reduce((sum, [id, weight]) => sum + weight * judge.dimensions[id].rating, 0) / 4;
          if (score !== judge.score || text(judgeNode.querySelector('[data-judge-score]')) !== scoreText(score)) failures.push('Judge weighted score mismatch.');
          if (text(judgeNode.querySelector('[data-judge-readiness]')) !== judge.readiness) failures.push('Judge verdict mismatch.');
          const dimensionRows = [...judgeNode.querySelectorAll('[data-dimension-id]')];
          if (dimensionRows.map(value => value.dataset.dimensionId).join('|') !== 'V|G|A|D|S|C') failures.push('Six-dimension profile missing.');
          if (judgeNode.querySelector('[data-full-assessment] code')?.textContent !== JSON.stringify(judge.assessment, null, 2)) failures.push('Full judge assessment or citations changed.');
          if (judgeNode.querySelector('[data-judge-gate-cap], [data-judge-failed-gates]')) failures.push('Invented Engineering gates in work-spec review.');
        });
      }
    });
    const first = rows[0]?.querySelector('.model-run');
    if (first) {
      first.querySelector('summary').click();
      await settle();
      const prompt = first.querySelector('.model-run__prompt');
      const judging = first.querySelector('.model-run__judging');
      prompt.querySelector('summary').click();
      await settle();
      if (!first.open || !prompt.open || judging.open) failures.push('Input disclosure does not operate independently.');
      judging.querySelector('summary').click();
      await settle();
      if (!prompt.open || !judging.open || !visible(judging.querySelector('.work-spec-dimensions__table'))) failures.push('Judge inspector does not open independently.');
      const assessment = judging.querySelector('.work-spec-assessment');
      assessment.querySelector('summary').click();
      await settle();
      if (!assessment.open || !visible(assessment.querySelector('[data-full-assessment]'))) failures.push('Full judge evidence unavailable.');
      if (Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1) failures.push('Expanded work-spec inspector overflows.');
      first.querySelector('summary').click();
      await settle();
    }
  } else {
    const categoryIds = [...document.querySelectorAll('.capability-selector__tab')].map(node => node.dataset.categoryId);
    if (categoryIds.join('|') !== (window.VASIR_DATA.overall ? 'overall|engineering|games|writing|product-design|ai-workflows' : 'overall|engineering|ai-workflows')) failures.push('Family navigation is incomplete.');
    const overallTab = document.querySelector('#capability-category-overall');
    if (['.capability-selector__long', '.capability-selector__short'].some(selector => text(overallTab?.querySelector(selector)) !== 'Overall')) failures.push('Overall sidebar label mismatch.');
    const rows = [...document.querySelectorAll('.capability-rank-row')];
    if (rows.length !== data.settings.length) failures.push('Work-spec leaderboard omits settings.');
    rows.forEach(row => {
      for (const condition of ['baseline', 'skill']) {
        const entry = data.entries.find(value => value.settingId === row.dataset.settingId && value.condition === condition);
        const numeric = condition === 'skill' ? row.dataset.fullScore : row.dataset.baselineScore;
        if (Number.isFinite(entry.score) && Number(numeric) !== entry.score) failures.push('Leaderboard condition score mismatch.');
        const rank = expectedRank(entry.settingId, condition);
        if ((condition === 'skill' ? row.dataset.fullRank : row.dataset.baselineRank) !== String(rank)) failures.push('Leaderboard does not preserve exact-score competition ranks.');
        const reading = row.querySelector('.capability-rank-row__reading--' + (condition === 'skill' ? 'full' : 'baseline'));
        if ([...(reading?.children || [])].map(child => child.tagName).join('|') !== 'SPAN|STRONG|SMALL') failures.push('Leaderboard condition must share Engineering score and #rank markup.');
        const scoreNode = reading?.querySelector(':scope > strong');
        const rankNode = reading?.querySelector(':scope > small');
        if (text(scoreNode) !== (Number.isFinite(entry.score) ? entry.score.toFixed(1) : '—') || text(rankNode) !== (rank ? '#' + rank : '—')) failures.push('Leaderboard visible score or #rank differs from its condition result.');
        if (visible(reading) && scoreNode && rankNode) {
          const scoreBox = scoreNode.getBoundingClientRect();
          const rankBox = rankNode.getBoundingClientRect();
          if (rankBox.left < scoreBox.right - 1 || Math.abs(rankBox.bottom - scoreBox.bottom) > 4 || reading.scrollWidth > reading.clientWidth + 1) failures.push('Leaderboard score and #rank must remain adjacent on one unclipped line.');
        }
        if (row.querySelector('[data-condition-readiness], .work-spec-readiness, .capability-rank-row__reading--work-spec')) failures.push('Leaderboard row retains a workflow-specific readiness layout.');
        if (condition === 'skill' && Number.isFinite(entry.delta) && Number(row.dataset.delta) !== entry.delta) failures.push('Paired uplift changed through display rounding.');
        if (condition === 'skill' && Number.isFinite(entry.delta)) {
          const deltaLabel = (entry.delta > 0 ? '+' : entry.delta < 0 ? '−' : '±') + Math.abs(entry.delta).toFixed(1);
          if (text(row.querySelector('.capability-rank-row__delta')).replace(/\s*pts$/, '') !== deltaLabel) failures.push('Leaderboard visible uplift differs from its exact-score paired result.');
          if (text(row.querySelector('.capability-rank-row__position')) !== '#' + String(rank).padStart(2, '0')) failures.push('Leaderboard visible setting rank breaks competition ties.');
        }
      }
    });
    const mode = target === 'workflow-benchmarks' ? 'benchmarks' : target === 'workflow-efficiency' ? 'efficiency' : 'models';
    if (mode !== 'benchmarks') {
      for (const condition of ['baseline', 'skill']) {
        const leaders = data.entries.filter(entry => entry.condition === condition && expectedRank(entry.settingId, condition) === 1);
        const hero = document.querySelector('[data-leader-condition="' + condition + '"]');
        if (Number(hero?.dataset.leaderCount) !== leaders.length) failures.push('Hero omits co-leader count.');
        if (leaders.length > 1 && !text(hero?.querySelector('dt')).includes(leaders.length + ' co-leaders')) failures.push('Tied hero claims a singular leader.');
        const identities = [...(hero?.querySelectorAll('[data-leader-entry-id]') || [])];
        if (identities.length !== leaders.length || leaders.some(entry => !identities.some(node => node.dataset.leaderEntryId === entry.id && text(node) === entry.family + ' · ' + entry.reasoning))) failures.push('Hero omits or changes a tied setting name.');
      }
    }
    if (document.querySelector('.capability-mode__tab[aria-selected="true"]')?.dataset.capabilityMode !== mode) failures.push('Workflow view route mismatch.');
    if (mode === 'benchmarks' && !document.querySelector('a[href="./benchmark-report.html#work-spec-chat"]')) failures.push('Work-spec report link missing.');
    if (mode === 'efficiency') {
      const scoredEntries = data.entries.filter(entry => Number.isFinite(entry.score));
      if (document.querySelectorAll('[data-plot-point]').length !== scoredEntries.length) failures.push('Efficiency points do not match assessable results.');
      const selectedEntry = data.entries.find(entry => entry.id === document.querySelector('#efficiency-entry')?.value);
      if (text(document.querySelector('[data-selected-readiness]')) !== selectedEntry?.readinessLabel) failures.push('Selected efficiency result omits its readiness verdict.');
    }
    // The clean category header exposes the sample size; calibration limitations
    // live in its accessible benchmark report. The runner follows this exact link
    // and audits the rendered qualification and full provenance before returning.
    const initialHash = location.hash;
    try {
      if (mode !== 'benchmarks') {
        document.querySelector('[data-capability-mode="benchmarks"]')?.click();
        await settle();
      }
      const expectedReportUrl = new URL('benchmark-report.html#work-spec-chat', location.href);
      const reportLink = [...document.querySelectorAll('#capability-benchmarks a[href]')].find(link => link.href === expectedReportUrl.href);
      if (!visible(reportLink) || !text(reportLink)) failures.push('Workflow calibration report is not inspectable from Benchmark tests.');
      else disclosureReportHref = reportLink.href;
    } finally {
      if (mode !== 'benchmarks') {
        document.querySelector('[data-capability-mode="' + mode + '"]')?.click();
        await settle();
      }
      if (location.hash !== initialHash || document.querySelector('.capability-mode__tab[aria-selected="true"]')?.dataset.capabilityMode !== mode) failures.push('Workflow disclosure audit did not restore the initial view.');
    }
  }
  [...document.querySelectorAll('button, a[href], summary, select')].filter(visible).forEach(element => {
    if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby') && !element.labels?.length && !text(element)) failures.push('Unnamed workflow control.');
  });
  return { failures, disclosureReportHref, benchmarkCount: data.benchmarks.length, settingCount: data.settings.length, entryCount: data.entries.length, resultCount: data.benchmarkResults.length, d3Version: window.d3?.version || '' };
}

function guideTarget(score) {
  const field = document.querySelector('.score-field--combined');
  const track = field?.querySelector('.capability-composition__track');
  const list = field?.querySelector('.result-list');
  if (!field || !track || !list) return { found: false };
  const trackBox = track.getBoundingClientRect();
  const style = getComputedStyle(track);
  const leftBorder = Number.parseFloat(style.borderLeftWidth) || 0;
  const rightBorder = Number.parseFloat(style.borderRightWidth) || 0;
  const contentLeft = trackBox.left + leftBorder;
  const contentWidth = trackBox.width - leftBorder - rightBorder;
  const listBox = list.getBoundingClientRect();
  return {
    found: true,
    score,
    x: contentLeft + contentWidth * score / 100,
    y: Math.min(listBox.bottom - 4, listBox.top + 24),
    list: {
      top: listBox.top,
      bottom: listBox.bottom
    }
  };
}

function guideState() {
  const guide = document.querySelector('.capability-score-guide');
  const line = guide?.querySelector('.capability-score-guide__line');
  const list = document.querySelector('.score-field--combined .result-list');
  if (!guide || !line || !list) return { found: false };
  const guideStyle = getComputedStyle(guide);
  const lineBox = line.getBoundingClientRect();
  const listBox = list.getBoundingClientRect();
  return {
    found: true,
    visible: guide.classList.contains('is-visible')
      && guideStyle.display !== 'none'
      && Number(guideStyle.opacity) > 0,
    score: Number(guide.dataset.score),
    source: guide.dataset.source || '',
    line: {
      centerX: lineBox.left + lineBox.width / 2,
      top: lineBox.top,
      bottom: lineBox.bottom,
      width: lineBox.width
    },
    list: {
      top: listBox.top,
      bottom: listBox.bottom
    }
  };
}

let socket;
const pageErrors = [];
try {
  const port = await waitFor(() => {
    if (!fs.existsSync(portFile)) return null;
    return Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]) || null;
  });
  socket = await connect(port);
  const protocol = createProtocol(socket);

  protocol.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    pageErrors.push('exception: ' + (exceptionDetails?.exception?.description || exceptionDetails?.text || 'unknown'));
  });
  protocol.on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type !== 'error' && type !== 'assert') return;
    pageErrors.push('console.' + type + ': ' + args.map((argument) => argument.value ?? argument.description ?? '').join(' '));
  });
  protocol.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error') pageErrors.push('log: ' + entry.text);
  });
  protocol.on('Network.loadingFailed', ({ errorText, canceled }) => {
    if (!canceled) pageErrors.push('network: ' + errorText);
  });
  protocol.on('Network.responseReceived', ({ response }) => {
    if (response.status >= 400) pageErrors.push('http ' + response.status + ': ' + response.url);
  });

  await Promise.all([
    protocol.send('Page.enable'),
    protocol.send('Runtime.enable'),
    protocol.send('Log.enable'),
    protocol.send('Network.enable'),
    protocol.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height
    }),
    protocol.send('Emulation.setTouchEmulationEnabled', {
      enabled: false,
      maxTouchPoints: 1
    })
  ]);

  const loaded = protocol.once('Page.loadEventFired', NAVIGATION_LOAD_TIMEOUT_MS);
  await protocol.send('Page.navigate', { url: pageUrl.href });
  await loaded;

  const evaluate = async (source) => {
    const response = await protocol.send('Runtime.evaluate', {
      expression: source,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception?.description
        || response.exceptionDetails.text
        || 'browser evaluation failed'
      );
    }
    return response.result.value;
  };

  const readinessExpression = [
    "document.readyState === 'complete'",
    'Boolean(window.VASIR_DATA)',
    isReportCapture ? 'Boolean(window.VASIR_RESPONSES)' : 'true',
    "document.fonts.status === 'loaded'"
  ].join(' && ');
  await waitFor(async () => {
    const ready = await evaluate(readinessExpression);
    return ready || null;
  });
  await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');

  const manifest = await evaluate('(' + readManifest.toString() + ')()');
  if (
    !manifest
    || manifest.kind !== 'vasirbenchmark-public-projection'
    || ![2, 3, 4, 5, 6].includes(manifest.schemaVersion)
    || manifest.scoreEdition !== 'backend-architecture-panel-consensus-v2'
    || manifest.scoreMethod !== 'equal-benchmark-absolute-mean-v1'
    || manifest.conditions.join('|') !== 'baseline|skill'
    || manifest.categories.join('|') !== 'engineering'
    || manifest.benchmarks.join('|') !== 'hyper-scale-chat|personalized-home-feed|device-telemetry'
    || !EXPECTED_FABLE_5_1_CONFIGURATION_IDS.every((configurationId) => manifest.configurationIds.includes(configurationId))
    || !EXPECTED_ASTRA_CONFIGURATION_IDS.every((configurationId) => manifest.configurationIds.includes(configurationId))
    || manifest.settingCount !== EXPECTED_PUBLIC_COUNTS.settings
    || manifest.entryCount !== EXPECTED_PUBLIC_COUNTS.entries
    || manifest.resultCount !== EXPECTED_PUBLIC_COUNTS.responses
    || (
      isReportCapture
      && (
        manifest.responseKind !== 'vasirbenchmark-public-responses'
        || ![2, 3].includes(manifest.responseSchemaVersion)
        || manifest.responseCount !== EXPECTED_PUBLIC_COUNTS.responses
        || manifest.judgmentCount !== EXPECTED_PUBLIC_COUNTS.responses * 2
      )
    )
  ) throw new Error('Invalid real-data projection manifest: ' + JSON.stringify(manifest));

  if (isReportCapture && !pageUrl.pathname.endsWith('benchmark-report.html')) {
    throw new Error('The report target requires benchmark-report.html.');
  }
  if (!isReportCapture && pageUrl.pathname.endsWith('benchmark-report.html')) {
    throw new Error(captureTarget + ' requires the main benchmark page.');
  }

  const hasOverall = await evaluate('Boolean(window.VASIR_DATA.overall)');
  const overallSourceOracle = !isReportCapture && hasOverall ? await loadOverallV3Oracle(evaluate) : null;
  if (!isReportCapture && hasOverall) {
    const navigationAudit = await evaluate('(' + auditCategoryNavigation.toString() + ')(' + JSON.stringify(overallSourceOracle?.writingCatalog ?? null) + ')');
    if (navigationAudit.failures.length) throw new Error('QA failed: ' + navigationAudit.failures.join('; '));
  }
  const audit = isGamesCapture ? await evaluate('(' + auditGames.toString() + ')(' + JSON.stringify(captureTarget) + ')') : isOverallTarget && hasOverall
    ? await evaluate('(' + auditOverall.toString() + ')(' + JSON.stringify(captureTarget) + ',' + JSON.stringify(overallSourceOracle) + ',(' + auditOverallAvailableProfiles.toString() + '))')
    : isWorkflowCapture ? await evaluate('(' + auditWorkflows.toString() + ')(' + JSON.stringify(captureTarget) + ')') : await evaluate(
    '(' + auditSite.toString() + ')('
      + JSON.stringify(captureTarget)
      + ',' + width
      + ',' + JSON.stringify(EXPECTED_PUBLIC_COUNTS)
      + ',' + JSON.stringify(EXPECTED_FABLE_5_1_CONFIGURATION_IDS)
      + ',' + JSON.stringify(EXPECTED_ASTRA_CONFIGURATION_IDS)
      + ',' + JSON.stringify(EXPECTED_CLAUDE_MODEL_LABELS)
      + ',' + EXPECTED_CLAUDE_SETTING_COUNT
      + ')'
  );
  if (audit.failures.length) throw new Error('QA failed: ' + audit.failures.join('; '));

  if (isWorkflowCapture && !isReportCapture) {
    if (!audit.disclosureReportHref) throw new Error('QA failed: Workflow calibration report link missing.');
    const reportLoaded = protocol.once('Page.loadEventFired', NAVIGATION_LOAD_TIMEOUT_MS);
    await protocol.send('Page.navigate', { url: audit.disclosureReportHref });
    await reportLoaded;
    await waitFor(async () => await evaluate(readinessExpression + ' && Boolean(window.VASIR_RESPONSES)'));
    const reportAudit = await evaluate('(' + auditWorkflows.toString() + ')("workflow-report")');
    if (reportAudit.failures.length) throw new Error('QA failed in linked Workflow disclosure report: ' + reportAudit.failures.join('; '));
    const restored = protocol.once('Page.loadEventFired', NAVIGATION_LOAD_TIMEOUT_MS);
    await protocol.send('Page.navigate', { url: pageUrl.href });
    await restored;
    await waitFor(async () => await evaluate(readinessExpression));
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }

  if (captureTarget === 'report' || captureTarget === 'workflow-report') {
    const overallReportUrl = new URL(pageUrl);
    overallReportUrl.searchParams.set('from', 'overall');
    const overallLoaded = protocol.once('Page.loadEventFired', NAVIGATION_LOAD_TIMEOUT_MS);
    await protocol.send('Page.navigate', { url: overallReportUrl.href });
    await overallLoaded;
    await waitFor(async () => await evaluate(readinessExpression));
    const overallBreadcrumb = await evaluate("document.querySelector('.report-breadcrumb a[href=\"./index.html#capabilities/overall/benchmarks\"]')?.textContent.trim()");
    if (overallBreadcrumb !== 'Overall') throw new Error('QA failed: Overall report breadcrumb label mismatch.');
    const restored = protocol.once('Page.loadEventFired', NAVIGATION_LOAD_TIMEOUT_MS);
    await protocol.send('Page.navigate', { url: pageUrl.href });
    await restored;
    await waitFor(async () => await evaluate(readinessExpression));
  }

  if (isOverallTarget && hasOverall) {
    const editions = {overall: overallSourceOracle ? 'Overall v3' : 'Overall v2', engineering: 'Engineering v2', games: 'Games v1 pilot', 'ai-workflows': 'Work Specs v1'};
    const expectedWritingSelection = pageUrl.searchParams.get('score') || 'all-writing';
    // Every published category participates in the same keyboard navigation.
    const hasGames = await evaluate('Boolean(window.VASIR_DATA.games)');
    const hasWriting = await evaluate('Boolean(window.VASIR_DATA.writing?.coverage?.caseCount)');
    const navigationSteps = [
      {category: 'engineering'}, ...(hasGames ? [{category: 'games', move: 'next'}] : []),
      ...(hasWriting ? [{category: 'writing', move: 'next'}] : []), {category: 'ai-workflows', move: 'next'},
      {category: 'overall', move: 'next'}, {category: 'ai-workflows', key: 'End'},
      ...(hasWriting ? [{category: 'writing', move: 'previous'}] : []),
      ...(hasGames ? [{category: 'games', move: 'previous'}] : []), {category: 'engineering', move: 'previous'}, {category: 'overall', key: 'Home'}
    ];
    for (const step of navigationSteps) {
      const {category} = step;
      const editionMatches = category === 'writing'
        ? '(() => { const projection = window.VASIR_WRITING_CATEGORY; const method = document.querySelector(".capability-canvas__header details[data-writing-index-method]"); return projection?.writingCategory.selection.id === ' + JSON.stringify(expectedWritingSelection) + ' && document.querySelector("#writing-score-selection")?.value === projection.writingCategory.selection.id && document.querySelector(".capability-canvas__status")?.textContent.trim() === projection.writingCategory.selection.title + " · Published benchmark results" && method && !method.open && method.querySelector("summary")?.textContent.trim() === "Methodology" && /provisional/i.test(method.textContent) === projection.scoreBasis.provisional; })()'
        : category === 'overall'
          ? '((document.querySelector(".capability-canvas__status")?.textContent || "") + " " + (document.querySelector(".benchmark-mast__evidence")?.textContent || "")).includes(' + JSON.stringify(editions[category]) + ')'
          : 'document.querySelector(".capability-canvas__status")?.textContent.includes(' + JSON.stringify(editions[category]) + ')';
      let key = step.key;
      if (step.move) {
        const vertical = await evaluate('document.querySelector(".capability-selector__tabs")?.getAttribute("aria-orientation") === "vertical"');
        key = step.move === 'next' ? vertical ? 'ArrowDown' : 'ArrowRight' : vertical ? 'ArrowUp' : 'ArrowLeft';
      }
      const keyCode = {End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40}[key];
      if (key) {
        await protocol.send('Input.dispatchKeyEvent', {type: 'keyDown', key, code: key, windowsVirtualKeyCode: keyCode});
      } else {
        await evaluate('document.querySelector(' + JSON.stringify('#capability-category-' + category) + ').click()');
      }
      await waitFor(async () => {
        try {
          return await evaluate('document.readyState === "complete" && document.querySelector('
            + JSON.stringify('#capability-category-' + category)
            + ')?.getAttribute("aria-selected") === "true" && (' + editionMatches
            + ') && document.activeElement?.id === '
            + JSON.stringify('capability-category-' + category));
        } catch { return false; }
      }).catch(async error => {
        const actual = await evaluate('({hash:location.hash,selected:document.querySelector(".capability-selector__tab[aria-selected=true]")?.dataset.categoryId,edition:document.querySelector(".capability-canvas__status")?.textContent,focused:document.activeElement?.id})').catch(() => null);
        throw new Error('Category keyboard navigation failed for ' + category + ': ' + error.message + ' · ' + JSON.stringify(actual));
      });
      if (key) await protocol.send('Input.dispatchKeyEvent', {type: 'keyUp', key, code: key, windowsVirtualKeyCode: keyCode});
    }
  }

  if ((isWorkflowCapture || isGamesCapture) && !isReportCapture) {
    const rowLayout = () => {
      const row = document.querySelector('.capability-rank-row');
      return ['.capability-rank-row__reading--baseline', '.capability-rank-row__reading--full', '.capability-rank-row__delta'].map(selector => {
        const element = row?.querySelector(selector);
        if (!element) return null;
        const style = getComputedStyle(element);
        return {
          display: style.display,
          // The shared auto track legitimately grows from #1 to #15.
          columns: style.gridTemplateColumns === 'none' ? 0 : style.gridTemplateColumns.trim().split(/\s+/).length,
          alignment: style.alignItems,
          gap: style.gap,
          whiteSpace: style.whiteSpace,
          children: [...element.children].map(child => {
            const childStyle = getComputedStyle(child);
            return { tag: child.tagName, display: childStyle.display, font: childStyle.fontFamily, size: childStyle.fontSize, weight: childStyle.fontWeight, lineHeight: childStyle.lineHeight };
          })
        };
      });
    };
    const workflowRowLayout = ['workflows', 'games'].includes(captureTarget) ? await evaluate('(' + rowLayout.toString() + ')()') : null;
    await evaluate("document.querySelector('#capability-category-engineering').click()");
    await waitFor(async () => {
      try {
        return await evaluate("document.readyState === 'complete' && document.querySelector('#capability-category-engineering')?.getAttribute('aria-selected') === 'true' && document.querySelector('.capability-canvas__status')?.textContent.includes('Engineering v2') && document.activeElement?.id === 'capability-category-engineering'");
      } catch { return false; }
    });
    if (workflowRowLayout) {
      const engineeringRowLayout = await evaluate('(' + rowLayout.toString() + ')()');
      if (JSON.stringify(workflowRowLayout) !== JSON.stringify(engineeringRowLayout)) {
        const differences = workflowRowLayout.flatMap((reading, index) => Object.keys(reading).filter(key => JSON.stringify(reading[key]) !== JSON.stringify(engineeringRowLayout[index]?.[key])).map(key => ({ reading: index, property: key, workflows: reading[key], engineering: engineeringRowLayout[index]?.[key] })));
        throw new Error('QA failed: ' + (isGamesCapture ? 'Games' : 'AI Workflows') + ' score and comparison layout differs from Engineering at this viewport: ' + JSON.stringify(differences));
      }
    }
    const returnCategory = isGamesCapture ? 'games' : 'ai-workflows';
    const returnEdition = isGamesCapture ? 'Games v1 pilot' : 'Work Specs v1';
    await evaluate('document.querySelector(' + JSON.stringify('#capability-category-' + returnCategory) + ').click()');
    await waitFor(async () => {
      try {
        return await evaluate("document.readyState === 'complete' && document.querySelector(" + JSON.stringify('#capability-category-' + returnCategory) + ")?.getAttribute('aria-selected') === 'true' && document.querySelector('.capability-canvas__status')?.textContent.includes(" + JSON.stringify(returnEdition) + ") && document.activeElement?.id === " + JSON.stringify('capability-category-' + returnCategory));
      } catch { return false; }
    });
    if (isGamesCapture) {
      const mode = captureTarget === 'game-efficiency' ? 'efficiency' : captureTarget === 'game-benchmarks' ? 'benchmarks' : 'models';
      await evaluate('document.querySelector(' + JSON.stringify('[data-capability-mode="' + mode + '"]') + ').click(); new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    }
  }

  if (captureTarget === 'game-efficiency') {
    const pairs = await evaluate(`(() => [...document.querySelectorAll('[data-game-plot]')].map(plot => {
      const points = [...plot.querySelectorAll('[data-game-effort-run]')];
      let closest = null;
      for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
        const a = points[i].getBoundingClientRect(), b = points[j].getBoundingClientRect();
        const distance = Math.hypot(a.left - b.left, a.top - b.top);
        if (distance > 0 && (!closest || distance < closest.distance)) closest = { distance, ids: [points[i].dataset.gameEffortRun, points[j].dataset.gameEffortRun] };
      }
      return closest?.ids || [];
    }))()`);
    for (const id of pairs.flat()) {
      const coordinates = await evaluate(`(async () => {
        const point = document.querySelector('[data-game-effort-run="' + CSS.escape(${JSON.stringify(id)}) + '"]');
        point.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const box = point.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      })()`);
      if (width <= 430) {
        await protocol.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...coordinates, id: 1 }] });
        await protocol.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await protocol.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...coordinates });
        await protocol.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...coordinates, button: 'left', clickCount: 1 });
        await protocol.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...coordinates, button: 'left', clickCount: 1 });
      }
      try {
        await waitFor(async () => await evaluate('Boolean(document.querySelector(' + JSON.stringify('[data-game-selected-run="' + id + '"]') + '))'));
      } catch {
        const actual = await evaluate(`({ selected: [...document.querySelectorAll('[data-game-selected-run]')].map(element => element.dataset.gameSelectedRun), hit: document.elementFromPoint(${coordinates.x}, ${coordinates.y})?.className })`);
        throw new Error('Nearest game point did not select from native coordinates: ' + JSON.stringify({ id, coordinates, actual }));
      }
    }
    await evaluate(`(() => {
      const reports = window.VASIR_DATA.games.benchmarks || [window.VASIR_DATA.games];
      reports.forEach(report => {
        const select = document.querySelector('[data-game-efficiency-entry][data-game-report-id="' + CSS.escape(report.benchmark.id) + '"]');
        select.value = (report.runs.find(run => run.conditionId === report.conditions[1]?.id) || report.runs[0]).id;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    })()`);
  }

  let guideAudit = 'mobile-not-applicable';
  if (captureTarget === 'leaderboard' && width > 1080) {
    const target = await evaluate('(' + guideTarget.toString() + ')(63.2)');
    if (!target.found) throw new Error('Synced guide target was not found.');
    await protocol.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: target.x,
      y: target.y
    });
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const state = await evaluate('(' + guideState.toString() + ')()');
    const guidePassed = (
      state.found
      && state.visible
      && state.source === 'pointer'
      && Math.abs(state.score - 63.2) <= 0.12
      && Math.abs(state.line.centerX - target.x) <= 2
      && Math.abs(state.line.top - state.list.top) <= 2
      && Math.abs(state.line.bottom - state.list.bottom) <= 2
      && state.line.width >= 1.5
    );
    if (!guidePassed) throw new Error('Synced vertical score guide failed: ' + JSON.stringify({ target, state }));
    guideAudit = 'pointer@63.2-spans-10-rows';
    await protocol.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const cleared = await evaluate('(' + guideState.toString() + ')()');
    if (cleared.visible) throw new Error('Synced vertical score guide did not clear after pointer exit.');
  }

  if (pageErrors.length) throw new Error('Page errors: ' + [...new Set(pageErrors)].join('; '));

  await evaluate(
    "window.scrollTo({ top: 0, behavior: 'instant' }); new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
  );
  if (captureTarget === 'workflow-inspector') {
    await evaluate(`(() => {
      const run = document.querySelector('.model-run');
      run.open = true;
      run.querySelectorAll('.model-run__prompt').forEach(prompt => { prompt.open = false; });
      const judging = run.querySelector('.model-run__judging');
      judging.open = true;
      return new Promise(resolve => requestAnimationFrame(() => {
        judging.scrollIntoView({ block: 'start', behavior: 'instant' });
        requestAnimationFrame(resolve);
      }));
    })()`);
  }
  if (captureTarget === 'overall-coverage') {
    await evaluate("document.querySelector('.overall-coverage').scrollIntoView({ block: 'start', behavior: 'instant' }); new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  }
  if (captureTarget === 'overall-method') {
    await evaluate(`(() => {
      const disclosure = document.querySelector('details.overall-weights');
      if (!disclosure) throw new Error('Overall target-weight disclosure is missing.');
      disclosure.open = true;
      return new Promise(resolve => requestAnimationFrame(() => {
        disclosure.scrollIntoView({ block: 'start', behavior: 'instant' });
        requestAnimationFrame(resolve);
      }));
    })()`);
  }
  const screenshot = await protocol.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  const png = Buffer.from(screenshot.data, 'base64');
  if (
    png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
    || png.readUInt32BE(16) !== width
    || png.readUInt32BE(20) !== height
  ) throw new Error('Chrome returned a screenshot with unexpected PNG dimensions.');

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, png);
  console.log(
    path.basename(destination)
    + ' · #' + targetRoutes[captureTarget]
    + ' · ' + width + '×' + height
    + ' · ' + (audit.categoryCount || 1) + ' categories / '
    + audit.benchmarkCount + ' benchmarks / '
    + audit.settingCount + ' settings / '
    + audit.entryCount + ' condition entries / '
    + audit.resultCount + ' result cells'
    + (isReportCapture ? ' · report evidence checked' : ' · D3 ' + audit.d3Version)
    + ' · Claude release identities fit'
    + ' · guide ' + guideAudit
    + ' · QA clean'
  );
} catch (error) {
  console.error('Capture failed: ' + error.message);
  if (pageErrors.length) console.error('Observed page errors: ' + [...new Set(pageErrors)].join('; '));
  process.exitCode = 1;
} finally {
  socket?.close();
  if (chrome.exitCode === null) {
    const exited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill('SIGTERM');
    await Promise.race([exited, delay(1800)]);
  }
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}
