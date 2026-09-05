#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [pageInput, destinationInput, widthInput, heightInput, requestedTarget = 'leaderboard'] = process.argv.slice(2);
const width = Number(widthInput);
const height = Number(heightInput);
const captureTarget = requestedTarget.toLowerCase();
const captureTargets = new Set([
  'leaderboard',
  'capabilities',
  'capability-benchmarks',
  'efficiency',
  'report'
]);
const targetRoutes = {
  leaderboard: 'capabilities/overall',
  capabilities: 'capabilities/engineering',
  'capability-benchmarks': 'capabilities/engineering/benchmarks',
  efficiency: 'capabilities/overall/efficiency',
  report: 'hyper-scale-chat'
};
const EXPECTED_SETTING_COUNT = 36;
const EXPECTED_CONDITION_COUNT = 2;
const EXPECTED_BENCHMARK_COUNT = 3;
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
  console.error('Usage: capture.mjs PAGE DESTINATION WIDTH HEIGHT [leaderboard|capabilities|capability-benchmarks|efficiency|report]');
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

  const once = (method, timeout = 15_000) => Promise.race([
    new Promise((resolve) => {
      const methodWaiters = waiters.get(method) || [];
      methodWaiters.push(resolve);
      waiters.set(method, methodWaiters);
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for ' + method)), timeout))
  ]);

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
      || responseBundle.schemaVersion !== 2
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
    const retired = bodyText.match(/\b(?:illustrative|mock|fixture|fake data)\b/i);
    if (retired) failures.push(context + ': retired data language "' + retired[0] + '"');
    const retiredCondition = bodyText.match(/\b(?:with vasir|without vasir|full vasir)\b/i);
    if (retiredCondition) failures.push(context + ': retired condition label "' + retiredCondition[0] + '"');
    const retiredScope = bodyText.match(/\b(?:5 categories|24 benchmarks|20 model settings|4,320 runs)\b/i);
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
    const futureCategory = primaryText.match(/\b(?:AI Workflows|Product Design|Games)\b/);
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
  if (data.schemaVersion !== 2) failures.push('projection schema mismatch');
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

  const privatePattern = /(?:\/Users\/|\/home\/|file:\/\/|artifacts\/evaluations|evaluations\/runs\/)/i;
  const serializedData = JSON.stringify(data);
  if (privatePattern.test(serializedData)) failures.push('public projection leaks a private filesystem or artifact path');
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
    if (selectors.length !== 2) failures.push(context + ': category selector count ' + selectors.length + '/2');
    if (selectors.map((tab) => tab.dataset.categoryId).join('|') !== 'overall|engineering') {
      failures.push(context + ': category selector ids mismatch');
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
    if (
      !/0\s*25\s*50\s*75\s*100/.test(axisText)
      || !/Minimal baseline/i.test(axisText)
      || !/Architecture skill/i.test(axisText)
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
      if (text(document.querySelector('#ranking-title')) !== 'Architecture skill task scores') {
        failures.push(context + ': task-score heading is not explicit');
      }
      if (text(document.querySelector('#ranking .ui-eyebrow')) !== 'Engineering v2 field · all ' + expectedCounts.settings + ' matched settings') {
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
    }
    await routeTo('hyper-scale-chat');
    window.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
  };

  if (target === 'report') {
    await auditReports();
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
try {
  const port = await waitFor(() => {
    if (!fs.existsSync(portFile)) return null;
    return Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]) || null;
  });
  socket = await connect(port);
  const protocol = createProtocol(socket);
  const pageErrors = [];

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

  const loaded = protocol.once('Page.loadEventFired');
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
    captureTarget === 'report' ? 'Boolean(window.VASIR_RESPONSES)' : 'true',
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
    || manifest.schemaVersion !== 2
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
      captureTarget === 'report'
      && (
        manifest.responseKind !== 'vasirbenchmark-public-responses'
        || manifest.responseSchemaVersion !== 2
        || manifest.responseCount !== EXPECTED_PUBLIC_COUNTS.responses
        || manifest.judgmentCount !== EXPECTED_PUBLIC_COUNTS.responses * 2
      )
    )
  ) throw new Error('Invalid real-data projection manifest: ' + JSON.stringify(manifest));

  if (captureTarget === 'report' && !pageUrl.pathname.endsWith('benchmark-report.html')) {
    throw new Error('The report target requires benchmark-report.html.');
  }
  if (captureTarget !== 'report' && pageUrl.pathname.endsWith('benchmark-report.html')) {
    throw new Error(captureTarget + ' requires the main benchmark page.');
  }

  const audit = await evaluate(
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
    + ' · 1 category / '
    + EXPECTED_PUBLIC_COUNTS.benchmarks + ' benchmarks / '
    + EXPECTED_PUBLIC_COUNTS.settings + ' settings / '
    + EXPECTED_PUBLIC_COUNTS.entries + ' condition entries / '
    + EXPECTED_PUBLIC_COUNTS.responses + ' result cells'
    + (captureTarget === 'report' ? ' · report routes 3/3' : ' · D3 ' + audit.d3Version)
    + ' · Claude release identities fit'
    + ' · guide ' + guideAudit
    + ' · QA clean'
  );
} catch (error) {
  console.error('Capture failed: ' + error.message);
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
