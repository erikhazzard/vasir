#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [pageInput, destinationPath, widthArgument, heightArgument, targetArgument = 'leaderboard'] = process.argv.slice(2);
const chromeBinary = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const width = Number(widthArgument);
const height = Number(heightArgument);
const scoreGuidePreview = process.env.VASIR_CAPTURE_SCORE_GUIDE === undefined
  ? null
  : Number(process.env.VASIR_CAPTURE_SCORE_GUIDE);
const captureTarget = targetArgument.toLowerCase();
const captureTargets = ['leaderboard', 'capabilities', 'capability-benchmarks', 'efficiency', 'report'];
const isReportCapture = captureTarget === 'report';
const captureCapabilityCategory = captureTarget === 'capabilities' || captureTarget === 'capability-benchmarks'
  ? 'engineering'
  : 'overall';
const captureCapabilityMode = captureTarget === 'capability-benchmarks'
  ? 'benchmarks'
  : captureTarget === 'efficiency'
    ? 'efficiency'
    : 'models';
const capabilityRoute = (category, mode = 'models') => (
  `#capabilities/${category}${mode === 'models' ? '' : `/${mode}`}`
);

if (
  !pageInput ||
  !destinationPath ||
  !Number.isInteger(width) ||
  !Number.isInteger(height) ||
  width <= 0 ||
  height <= 0 ||
  !captureTargets.includes(captureTarget)
) {
  console.error('Usage: capture.mjs PAGE DESTINATION WIDTH HEIGHT [leaderboard|capabilities|capability-benchmarks|efficiency|report]');
  console.error('PAGE must be a local file path or an http(s) URL.');
  process.exit(1);
}

const isRemotePage = /^https?:\/\//i.test(pageInput);
let pageUrl;

if (isRemotePage) {
  try {
    pageUrl = new URL(pageInput);
  } catch {
    console.error(`Invalid page URL: ${pageInput}`);
    process.exit(1);
  }
} else {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(pageInput)) {
    console.error(`Unsupported page URL protocol: ${pageInput}`);
    process.exit(1);
  }
  if (!fs.existsSync(pageInput)) {
    console.error(`Page not found: ${pageInput}`);
    process.exit(1);
  }
  pageUrl = pathToFileURL(path.resolve(pageInput));
}

if (!fs.existsSync(chromeBinary)) {
  console.error(`Chrome not found at ${chromeBinary}. Set CHROME_BIN to a Chromium-compatible executable.`);
  process.exit(1);
}

const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vasirbench-final.'));
const portFile = path.join(profileDirectory, 'DevToolsActivePort');
pageUrl.hash = isReportCapture
  ? 'hyper-scale-chat'
  : captureTarget === 'leaderboard'
    ? 'leaderboard'
    : capabilityRoute(captureCapabilityCategory, captureCapabilityMode).slice(1);
const destination = path.resolve(destinationPath);
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
  `--user-data-dir=${profileDirectory}`,
  'about:blank'
], { stdio: 'ignore' });

async function waitFor(check, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await check();
    if (value) return value;
    await delay(50);
  }
  throw new Error(`Timed out after ${timeout}ms`);
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

    const eventWaiters = waiters.get(message.method) || [];
    if (eventWaiters.length) {
      waiters.delete(message.method);
      eventWaiters.forEach((resolve) => resolve(message.params));
    }
    (listeners.get(message.method) || []).forEach((listener) => listener(message.params));
  });

  const send = (method, params = {}, timeout = 15000) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out calling ${method} after ${timeout}ms`));
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

  const once = (method, timeout = 10000) => Promise.race([
    new Promise((resolve) => {
      const eventWaiters = waiters.get(method) || [];
      eventWaiters.push(resolve);
      waiters.set(method, eventWaiters);
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout))
  ]);

  const on = (method, listener) => {
    const eventListeners = listeners.get(method) || [];
    eventListeners.push(listener);
    listeners.set(method, eventListeners);
  };

  return { send, once, on };
}

async function connect(port) {
  const targets = await waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
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

const auditExpression = String.raw`(() => {
  const html = document.documentElement;
  const body = document.body;
  const counts = new Map();

  const classText = (element) => {
    if (typeof element.className === 'string') return element.className;
    return element.className && typeof element.className.baseVal === 'string' ? element.className.baseVal : '';
  };

  const isVisible = (element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
  };

  const labelledByText = (element) => (element.getAttribute('aria-labelledby') || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent.trim() || '')
    .join(' ')
    .trim();

  const labelText = (element) => {
    const labels = element.labels ? [...element.labels] : [];
    const wrapped = element.closest('label');
    if (wrapped && !labels.includes(wrapped)) labels.push(wrapped);
    return labels.map((label) => label.textContent.trim()).join(' ').trim();
  };

  const accessibleName = (element, allowText = true) => {
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    if (ariaLabel) return ariaLabel;
    const labelled = labelledByText(element);
    if (labelled) return labelled;
    const labels = labelText(element);
    if (labels) return labels;
    if (allowText && element.textContent.trim()) return element.textContent.trim();
    const imageAlt = element.querySelector('img[alt]')?.getAttribute('alt')?.trim();
    if (imageAlt) return imageAlt;
    const title = element.getAttribute('title')?.trim();
    if (title) return title;
    if (element.matches('input[type="button"], input[type="submit"], input[type="reset"]')) return element.value.trim();
    return '';
  };

  const describe = (element) => {
    const name = accessibleName(element) || element.id || classText(element) || element.tagName;
    return name.replace(/\s+/g, ' ').trim().slice(0, 56);
  };

  const isPlotPoint = (element) => {
    const identity = classText(element);
    const context = element.closest('[class*="plot"], [class*="plane"], [aria-label*="plot" i], [aria-label*="chart" i]');
    return element.hasAttribute('data-plot-point') ||
      (/point|dot|plot-mark/i.test(identity) && Boolean(context)) ||
      ((element.hasAttribute('data-entry-id') || element.hasAttribute('data-entry')) && Boolean(context));
  };

  document.querySelectorAll('[id]').forEach((element) => {
    counts.set(element.id, (counts.get(element.id) || 0) + 1);
  });
  const duplicates = [...counts]
    .filter(([, count]) => count > 1)
    .map(([id]) => id || '(empty id)');

  const semanticIssues = [];
  const buttonLikes = [...new Set([
    ...document.querySelectorAll('button'),
    ...document.querySelectorAll('[role="button"]')
  ])];
  buttonLikes.filter(isVisible).forEach((element) => {
    if (!accessibleName(element)) semanticIssues.push('unnamed ' + element.tagName.toLowerCase() + ' button');
  });
  document.querySelectorAll('select').forEach((element) => {
    if (isVisible(element) && !accessibleName(element, false)) semanticIssues.push('unlabeled select ' + describe(element));
  });
  document.querySelectorAll('input:not([type="hidden"]), textarea').forEach((element) => {
    if (isVisible(element) && !accessibleName(element, false)) semanticIssues.push('unlabeled ' + element.tagName.toLowerCase() + ' ' + describe(element));
  });
  document.querySelectorAll('a[href]').forEach((element) => {
    if (isVisible(element) && !accessibleName(element)) semanticIssues.push('unnamed link ' + element.getAttribute('href'));
  });
  document.querySelectorAll('details > summary').forEach((element) => {
    if (isVisible(element) && !accessibleName(element)) semanticIssues.push('unnamed details summary');
  });
  document.querySelectorAll('img').forEach((element) => {
    if (!element.hasAttribute('alt')) semanticIssues.push('image without alt ' + (element.getAttribute('src') || describe(element)));
  });

  const brokenHashes = [...document.querySelectorAll('a[href^="#"]')]
    .map((link) => link.getAttribute('href'))
    .filter((href) => {
      if (!href || href === '#') return true;
      try {
        return !document.getElementById(decodeURIComponent(href.slice(1)));
      } catch {
        return true;
      }
    });

  const tinyControls = [...new Set([
    ...document.querySelectorAll('button, select, [role="button"]'),
    ...document.querySelectorAll('details > summary')
  ])]
    .filter(isVisible)
    .filter((element) => {
      const box = element.getBoundingClientRect();
      const minimum = element.matches('.capability-composition__segment') ? 23.99 : 43.99;
      return box.width < minimum || box.height < minimum;
    })
    .slice(0, 24)
    .map((element) => {
      const box = element.getBoundingClientRect();
      return describe(element) + ' (' + box.width.toFixed(1) + '×' + box.height.toFixed(1) + ')';
    });

  const plotPoints = buttonLikes.filter((element) => isVisible(element) && isPlotPoint(element));
  const unfocusablePlotPoints = plotPoints
    .filter((element) => {
      if (element.matches('button, input')) return element.disabled;
      return element.tabIndex < 0;
    })
    .slice(0, 12)
    .map(describe);

  const documentScrollWidth = Math.max(html.scrollWidth, body?.scrollWidth || 0);
  const overflowingElements = [...document.querySelectorAll('body *')]
    .filter((element) => {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.position === 'fixed') return false;
      const box = element.getBoundingClientRect();
      return box.right > innerWidth + 1 || box.left < -1;
    })
    .slice(0, 20)
    .map((element) => {
      const box = element.getBoundingClientRect();
      return (classText(element) || element.tagName) + '@' + Math.round(box.left) + ':' + Math.round(box.right);
    });

  return {
    innerWidth,
    innerHeight,
    scrollWidth: documentScrollWidth,
    scrollHeight: Math.max(html.scrollHeight, body?.scrollHeight || 0),
    duplicates,
    semanticIssues: semanticIssues.slice(0, 24),
    brokenHashes: [...new Set(brokenHashes)],
    tinyControls,
    plotPointCount: plotPoints.length,
    unfocusablePlotPoints,
    overflowingElements
  };
})()`;

const reportAuditExpression = String.raw`(() => {
  const data = window.VASIR_DATA;
  const benchmark = data?.benchmarks.find((candidate) => candidate.id === 'hyper-scale-chat');
  const summary = data?.benchmarkSummaries.find((candidate) => candidate.benchmarkId === 'hyper-scale-chat');
  const failures = [];
  const text = (element) => element?.textContent.replace(/\s+/g, ' ').trim() || '';
  const number = (value) => {
    const match = String(value || '').replaceAll('−', '-').match(/[+-]?\d+(?:\.\d+)?/);
    const parsed = match ? Number.parseFloat(match[0]) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const closeEnough = (actual, expected, tolerance = 0.05) => (
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance
  );
  const isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
  };

  if (!benchmark || !summary) failures.push('hyper-scale-chat fixture/summary missing');
  if (location.hash !== '#hyper-scale-chat') failures.push('route ' + location.hash);
  if (benchmark?.evidenceKind !== 'development' || summary?.evidenceKind !== 'development') failures.push('measured evidence kind mismatch');
  if (summary?.sourceHref !== null || benchmark?.sourceHref != null) failures.push('public source metadata should be absent');
  if (text(document.querySelector('#report-title')) !== benchmark?.name) failures.push('report title mismatch');

  const truth = document.querySelector('.evidence-truth[aria-label="Evidence status"]');
  const truthText = text(truth);
  if (
    !isVisible(truth) ||
    !truthText.includes('Development snapshot') ||
    !truthText.includes('Calibration pending') ||
    !truthText.includes('Architecture skill') ||
    !truthText.includes('not Full Vasir') ||
    !truthText.includes('Raw responses and judgments remain local')
  ) {
    failures.push('measured truth statement mismatch: ' + truthText);
  }

  const conditions = [...document.querySelectorAll('.matched-result__condition')];
  const baselineLabel = text(conditions[0]?.querySelector('dt'));
  const treatmentLabel = text(conditions[1]?.querySelector('dt'));
  const baselineScore = number(conditions[0]?.querySelector('dd strong')?.textContent);
  const treatmentScore = number(conditions[1]?.querySelector('dd strong')?.textContent);
  const delta = number(document.querySelector('.matched-result__delta dd')?.textContent);
  if (conditions.length !== 2) failures.push('matched condition count ' + conditions.length + '/2');
  if (baselineLabel !== summary?.baselineLabel || treatmentLabel !== summary?.treatmentLabel) failures.push('matched condition labels mismatch');
  if (!closeEnough(baselineScore, summary?.baseline) || !closeEnough(treatmentScore, summary?.treatment)) failures.push('matched scores mismatch');
  if (!closeEnough(delta, summary?.delta)) failures.push('matched delta mismatch');

  const facts = [...document.querySelectorAll('.evidence-facts > div')];
  const factsByLabel = new Map(facts.map((fact) => [text(fact.querySelector('dt')), text(fact.querySelector('dd'))]));
  if (factsByLabel.get('Completion') !== summary?.complete + '/' + summary?.total + ' ' + summary?.completionLabel) failures.push('completion mismatch');
  if (factsByLabel.get('Matched record') !== summary?.wins + 'W · ' + summary?.ties + 'T · ' + summary?.losses + 'L') failures.push('W/T/L mismatch');
  if (factsByLabel.get('Calibration') !== summary?.calibration) failures.push('calibration mismatch');

  const breadcrumb = document.querySelector('.report-breadcrumb[aria-label="Benchmark hierarchy"]');
  const breadcrumbLinks = [...breadcrumb?.querySelectorAll('a[href]') || []];
  const back = document.querySelector('a.report-context__back[href]');
  const expectedBack = './index.html#capabilities/engineering/benchmarks';
  if (!breadcrumb || breadcrumbLinks.length !== 2) failures.push('breadcrumb link semantics');
  if (breadcrumbLinks[0]?.getAttribute('href') !== './index.html') failures.push('breadcrumb home href');
  if (breadcrumbLinks[1]?.getAttribute('href') !== expectedBack) failures.push('breadcrumb capability href');
  if (breadcrumb?.querySelector('[aria-current="page"]')?.textContent.trim() !== benchmark?.name) failures.push('breadcrumb current page mismatch');
  if (!back || back.tagName !== 'A' || back.getAttribute('href') !== expectedBack || !isVisible(back)) failures.push('native back link mismatch');

  const publicBoundary = document.querySelector('.report-overview__source');
  const publicBoundaryText = text(publicBoundary);
  const sourceLinks = [...document.querySelectorAll('.evidence-truth a[href], .report-overview__source a[href]')];
  if (sourceLinks.length !== 0) failures.push('public report exposes a source link');
  if (
    !isVisible(publicBoundary) ||
    text(publicBoundary?.querySelector('h3')) !== 'Public evidence boundary' ||
    !publicBoundaryText.includes('real development snapshot') ||
    !publicBoundaryText.includes('Raw responses, judgments') ||
    !publicBoundaryText.includes('not published here') ||
    !publicBoundaryText.includes('calibration remains pending')
  ) {
    failures.push('public evidence boundary mismatch: ' + publicBoundaryText);
  }
  const evidenceStateText = text([...document.querySelectorAll('.method-grid > section')]
    .find((section) => text(section.querySelector('h3')) === 'Evidence state'));
  if (
    !evidenceStateText.includes('Calibration pending') ||
    !evidenceStateText.includes('raw responses, judgments') ||
    !evidenceStateText.includes('remain local') ||
    !evidenceStateText.includes('not published here')
  ) {
    failures.push('method evidence boundary mismatch: ' + evidenceStateText);
  }

  const ranking = document.querySelector('#ranking');
  const disclaimer = ranking?.querySelector('.report-section__heading > p');
  const disclaimerText = text(disclaimer);
  if (
    !isVisible(ranking) ||
    !isVisible(disclaimer) ||
    !text(ranking?.querySelector('.ui-eyebrow')).includes('Illustrative model field') ||
    !disclaimerText.includes('mock data for the interface only') ||
    !disclaimerText.includes('not the source evidence behind a measured summary')
  ) {
    failures.push('illustrative model-field disclaimer mismatch: ' + disclaimerText);
  }

  return {
    route: location.hash,
    benchmarkId: benchmark?.id || '',
    baseline: baselineScore,
    treatment: treatmentScore,
    delta,
    completion: factsByLabel.get('Completion') || '',
    record: factsByLabel.get('Matched record') || '',
    breadcrumbLinks: breadcrumbLinks.length,
    sourceLinks: sourceLinks.length,
    disclaimerVisible: isVisible(disclaimer),
    failures
  };
})()`;

const reportRouteAuditExpression = String.raw`(async () => {
  const data = window.VASIR_DATA;
  const benchmarks = data?.benchmarks || [];
  const summaries = data?.benchmarkSummaries || [];
  const summaryById = new Map(summaries.map((summary) => [summary.benchmarkId, summary]));
  const benchmarkIds = benchmarks.map((benchmark) => benchmark.id);
  const benchmarkIdSet = new Set(benchmarkIds);
  const failures = [];
  const routes = [];
  const text = (element) => element?.textContent.replace(/\s+/g, ' ').trim() || '';
  const isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
  };
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const sectionNames = ['overview', 'overview', 'ranking', 'method', 'top'];

  if (benchmarks.length !== 24) failures.push('report manifest has ' + benchmarks.length + '/24 benchmarks');
  if (benchmarkIdSet.size !== benchmarks.length) failures.push('report manifest contains duplicate benchmark ids');
  if (summaries.length !== benchmarks.length || summaries.some((summary) => !benchmarkIdSet.has(summary.benchmarkId))) {
    failures.push('report summary manifest does not match benchmark manifest');
  }
  if (benchmarkIds.some((id) => !/^[a-z0-9-]+$/.test(id))) failures.push('report manifest contains an unsafe fragment id');

  for (const benchmark of benchmarks) {
    const routeFailures = [];
    const summary = summaryById.get(benchmark.id);
    const expectedHash = '#' + benchmark.id;
    window.location.hash = benchmark.id;
    await settle();

    const title = document.querySelector('#report-title');
    const truth = document.querySelector('.evidence-truth[aria-label="Evidence status"]');
    const truthText = text(truth);
    const publicBoundary = document.querySelector('.report-overview__source');
    const publicBoundaryText = text(publicBoundary);
    const currentBreadcrumb = document.querySelector('.report-breadcrumb [aria-current="page"]');
    const sourceLinks = [...document.querySelectorAll('.evidence-truth a[href], .report-overview__source a[href]')];
    const sectionLinks = [...document.querySelectorAll('[data-report-section]')];
    const paginationLinks = [...document.querySelectorAll('.report-pagination__link[href]')];
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);

    if (!summary) routeFailures.push('summary missing');
    if (location.hash !== expectedHash) routeFailures.push('hash ' + location.hash + ' != ' + expectedHash);
    if (!isVisible(title) || text(title) !== benchmark.name) routeFailures.push('rendered title mismatch');
    if (document.title !== benchmark.name + ' · VasirBench') routeFailures.push('document title mismatch');
    if (text(currentBreadcrumb) !== benchmark.name) routeFailures.push('breadcrumb current page mismatch');
    if (benchmark.evidenceKind !== summary?.evidenceKind) routeFailures.push('evidence kind mismatch');
    if (summary?.detailHref !== './benchmark-report.html#' + benchmark.id) routeFailures.push('detail route mismatch');
    if (sourceLinks.length !== 0) routeFailures.push('public source link exposed');
    if (scrollWidth > innerWidth) routeFailures.push('horizontal overflow ' + (scrollWidth - innerWidth) + 'px');

    if (
      sectionLinks.length !== sectionNames.length ||
      sectionLinks.some((link, index) => link.getAttribute('href') !== '#' + benchmark.id + '/' + sectionNames[index])
    ) {
      routeFailures.push('section fragment routes mismatch');
    }
    if (
      paginationLinks.length !== 2 ||
      paginationLinks.some((link) => {
        const target = link.getAttribute('href')?.slice(1) || '';
        return !benchmarkIdSet.has(target);
      })
    ) {
      routeFailures.push('pagination fragment routes mismatch');
    }

    if (benchmark.evidenceKind === 'development') {
      if (benchmark.sourceHref != null || summary?.sourceHref !== null) routeFailures.push('development source metadata should be absent');
      if (
        !isVisible(truth) ||
        !truthText.includes('Development snapshot') ||
        !truthText.includes('Calibration pending') ||
        !truthText.includes('Architecture skill') ||
        !truthText.includes('not Full Vasir') ||
        !truthText.includes('Raw responses and judgments remain local')
      ) {
        routeFailures.push('development truth boundary mismatch');
      }
      if (
        !isVisible(publicBoundary) ||
        text(publicBoundary?.querySelector('h3')) !== 'Public evidence boundary' ||
        !publicBoundaryText.includes('real development snapshot') ||
        !publicBoundaryText.includes('not published here') ||
        !publicBoundaryText.includes('calibration remains pending')
      ) {
        routeFailures.push('development public boundary mismatch');
      }
    } else {
      if (benchmark.sourceHref != null || summary?.sourceHref !== null) routeFailures.push('illustrative source metadata should be absent');
      if (
        !isVisible(truth) ||
        !truthText.includes('Illustrative design fixture') ||
        !truthText.includes('No run.json, judge artifacts, or source judgments exist')
      ) {
        routeFailures.push('illustrative truth boundary mismatch');
      }
      if (text(publicBoundary?.querySelector('h3')) !== 'Evidence not collected yet') {
        routeFailures.push('illustrative evidence boundary mismatch');
      }
    }

    routes.push({ id: benchmark.id, evidenceKind: benchmark.evidenceKind, failures: routeFailures });
    routeFailures.forEach((failure) => failures.push(benchmark.id + ': ' + failure));
  }

  window.location.hash = 'hyper-scale-chat';
  await settle();
  window.scrollTo({ top: 0, behavior: 'instant' });

  return {
    routeCount: routes.length,
    developmentCount: routes.filter((route) => route.evidenceKind === 'development').length,
    illustrativeCount: routes.filter((route) => route.evidenceKind === 'illustrative').length,
    restoredHash: location.hash,
    routes,
    failures
  };
})()`;

const capabilitySnapshotExpression = (category, mode) => String.raw`(async () => {
  const expectedCategory = @@CATEGORY@@;
  const expectedMode = @@MODE@@;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
  };
  const workspace = document.querySelector('#panel-capabilities');
  const capabilitySelectors = [...workspace?.querySelectorAll('.capability-selector__tab[data-category-id]') || []];
  const capabilityRows = [...workspace?.querySelectorAll('.capability-ranking:not([hidden]) .capability-rank-row[data-setting-id]') || []];
  const combinedRows = [...workspace?.querySelectorAll('.capability-ranking--combined:not([hidden]) .setting-row[data-setting-id]') || []];
  const capabilityModeTabs = [...workspace?.querySelectorAll('.capability-mode__tab[role="tab"][data-capability-mode]') || []];
  const selectedCapabilityModeTabs = capabilityModeTabs.filter((tab) => tab.getAttribute('aria-selected') === 'true');
  const capabilityModePanels = [...workspace?.querySelectorAll('#capability-ranking[role="tabpanel"], #capability-benchmarks[role="tabpanel"], #capability-efficiency[role="tabpanel"]') || []];
  const selectedCapabilityMode = selectedCapabilityModeTabs[0]?.getAttribute('data-capability-mode') || '';
  const controlledPanelId = selectedCapabilityModeTabs[0]?.getAttribute('aria-controls') || '';
  const activeModePanel = controlledPanelId ? document.getElementById(controlledPanelId) : null;
  const benchmarkTracks = [...workspace?.querySelectorAll('.benchmark-ledger:not([hidden]) .benchmark-ledger__track') || []];
  const benchmarkRows = [...workspace?.querySelectorAll('.benchmark-ledger:not([hidden]) .benchmark-ledger__row[data-benchmark-id]') || []];
  const capabilitySelectorRects = capabilitySelectors.map((selector) => selector.getBoundingClientRect());
  const capabilitySelectorHeader = workspace?.querySelector('.capability-selector__header');
  const capabilityCanvasHeader = workspace?.querySelector('.capability-canvas__header');
  const capabilityMode = workspace?.querySelector('.capability-mode');
  const capabilityModeLabel = workspace?.querySelector('.capability-mode__label');
  const capabilityModeTabsRoot = workspace?.querySelector('.capability-mode__tabs');
  const capabilityContentStart = workspace?.querySelector('.capability-ranking--combined:not([hidden]) .score-axis-header, .capability-ranking:not(.capability-ranking--combined):not([hidden]) .capability-ranking__axis, .benchmark-ledger:not([hidden]) .benchmark-ledger__track, .capability-efficiency:not([hidden]) .efficiency-controls');
  const capabilityAxis = workspace?.querySelector('.capability-ranking--combined:not([hidden]) .score-axis-header, .capability-ranking:not(.capability-ranking--combined):not([hidden]) .capability-ranking__axis');
  const capabilityBrowser = workspace?.querySelector('.capability-browser');
  const capabilityIndex = workspace?.querySelector('.capability-browser__index');
  const capabilityCanvas = workspace?.querySelector('.capability-browser__canvas');
  const pageFrame = document.querySelector('.page-frame');
  const capabilityModeRect = capabilityMode?.getBoundingClientRect();
  const capabilityModeTabsRect = capabilityModeTabsRoot?.getBoundingClientRect();
  const capabilityCanvasHeaderRect = capabilityCanvasHeader?.getBoundingClientRect();
  const capabilityCanvasRect = capabilityCanvas?.getBoundingClientRect();
  const pageFrameRect = pageFrame?.getBoundingClientRect();
  const capabilityModeTabRects = capabilityModeTabs.map((tab) => tab.getBoundingClientRect());
  const allowedKanit = [
    '.benchmark-mast__identity h1',
    '.capability-selector__tab > strong',
    '.capability-canvas__identity h3',
    '.capability-canvas__readings dd',
    '.score-axis-header__profile-title strong',
    '.capability-composition__total',
    '.setting-row__delta strong'
  ].join(', ');
  const unexpectedKanit = [...document.querySelectorAll('body *')]
    .filter((element) => getComputedStyle(element).fontFamily.includes('Kanit'))
    .filter((element) => !element.closest(allowedKanit));
  const modeTabRecords = capabilityModeTabs.map((tab) => {
    const controls = tab.getAttribute('aria-controls') || '';
    const controlledPanel = controls ? document.getElementById(controls) : null;
    return {
      id: tab.id,
      mode: tab.getAttribute('data-capability-mode') || '',
      selected: tab.getAttribute('aria-selected') || '',
      tabIndex: tab.tabIndex,
      controls,
      controlsPanel: controlledPanel?.id || '',
      panelLabelledBy: controlledPanel?.getAttribute('aria-labelledby') || ''
    };
  });

  return {
    expectedCategory,
    expectedMode,
    viewportWidth: innerWidth,
    d3Version: window.d3?.version || '',
    pageFrameLeft: pageFrameRect?.left ?? NaN,
    pageFrameRight: pageFrameRect?.right ?? NaN,
    pageFrameWidth: pageFrameRect?.width || 0,
    hash: location.hash,
    globalLensNavigationCount: document.querySelectorAll('.lens-navigation, .lens-tab[data-lens], #panel-efficiency').length,
    globalTabPanelCount: document.querySelectorAll('.benchmark-explorer > [role="tabpanel"]').length,
    workspaceVisible: isVisible(workspace),
    selectedEntry: workspace?.getAttribute('data-selected-entry') || '',
    combinedSettingRowCount: combinedRows.length,
    capabilitySelectorCount: workspace?.querySelectorAll('.capability-selector__tab[role="tab"][data-category-id]').length || 0,
    selectedCapabilitySelectorCount: workspace?.querySelectorAll('.capability-selector__tab[aria-selected="true"]').length || 0,
    selectedCapabilityCategory: workspace?.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
    capabilitySelectorOrientation: workspace?.querySelector('.capability-selector__tabs[role="tablist"]')?.getAttribute('aria-orientation') || '',
    capabilityModeTabCount: capabilityModeTabs.length,
    selectedCapabilityModeCount: selectedCapabilityModeTabs.length,
    selectedCapabilityMode,
    capabilityModeRovingZeroCount: capabilityModeTabs.filter((tab) => tab.tabIndex === 0).length,
    capabilityModePanelCount: capabilityModePanels.length,
    capabilityModeVisiblePanelCount: capabilityModePanels.filter(isVisible).length,
    capabilityModeAllControlsResolve: capabilityModeTabs.every((tab) => Boolean(document.getElementById(tab.getAttribute('aria-controls') || ''))),
    selectedCapabilityModeControls: selectedCapabilityModeTabs[0]?.getAttribute('aria-controls') || '',
    activeModePanelVisible: isVisible(activeModePanel),
    benchmarkTrackCount: benchmarkTracks.length,
    benchmarkRowCount: benchmarkRows.length,
    benchmarkMeasuredRowCount: benchmarkRows.filter((row) => row.getAttribute('data-evidence-kind') === 'development').length,
    benchmarkIllustrativeRowCount: benchmarkRows.filter((row) => row.getAttribute('data-evidence-kind') === 'illustrative').length,
    capabilityRowCount: workspace?.querySelectorAll('.capability-ranking:not([hidden]) .capability-rank-row[data-setting-id]').length || 0,
    capabilitySelectorTopSpread: capabilitySelectorRects.length
      ? Math.max(...capabilitySelectorRects.map((box) => box.top)) - Math.min(...capabilitySelectorRects.map((box) => box.top))
      : 0,
    capabilitySelectorsInViewport: capabilitySelectorRects.filter((box) => box.left >= -1 && box.right <= innerWidth + 1).length,
    capabilitySelectorMaxHeight: capabilitySelectorRects.length
      ? Math.max(...capabilitySelectorRects.map((box) => box.height))
      : 0,
    capabilitySelectorHeaderHeight: capabilitySelectorHeader?.getBoundingClientRect().height || 0,
    capabilitySelectorHeaderText: capabilitySelectorHeader?.textContent.replace(/\s+/g, ' ').trim() || '',
    capabilitySelectorMarkerCount: capabilitySelectorHeader?.querySelectorAll('.condition-mark--full').length || 0,
    selectedCapabilityViewingText: workspace?.querySelector('.capability-selector__tab[aria-selected="true"] .capability-selector__state')?.textContent.trim() || '',
    capabilityHeaderHeight: capabilityCanvasHeader?.getBoundingClientRect().height || 0,
    capabilityAxisHeight: capabilityAxis?.getBoundingClientRect().height || 0,
    capabilityHeaderText: capabilityCanvasHeader?.textContent.replace(/\s+/g, ' ').trim() || '',
    capabilityHeaderReadingCount: capabilityCanvasHeader?.querySelectorAll('.capability-canvas__reading').length || 0,
    capabilityModeHeight: capabilityModeRect?.height || 0,
    capabilityModeWidth: capabilityModeRect?.width || 0,
    capabilityModeHeaderGap: capabilityModeRect && capabilityCanvasHeaderRect ? capabilityModeRect.top - capabilityCanvasHeaderRect.bottom : Infinity,
    capabilityModeContentGap: capabilityModeRect && capabilityContentStart ? capabilityContentStart.getBoundingClientRect().top - capabilityModeRect.bottom : Infinity,
    capabilityModeFirstTabOffset: capabilityModeTabRects.length && capabilityCanvasRect ? capabilityModeTabRects[0].left - capabilityCanvasRect.left : Infinity,
    capabilityModeTabMaxWidth: capabilityModeTabRects.length ? Math.max(...capabilityModeTabRects.map((box) => box.width)) : 0,
    capabilityModeTabMinHeight: capabilityModeTabRects.length ? Math.min(...capabilityModeTabRects.map((box) => box.height)) : 0,
    capabilityModeTabsWidth: capabilityModeTabsRect?.width || 0,
    capabilityModeTabsCoveredWidth: capabilityModeTabRects.length ? capabilityModeTabRects.at(-1).right - capabilityModeTabRects[0].left : 0,
    capabilityModeTabWidthSpread: capabilityModeTabRects.length ? Math.max(...capabilityModeTabRects.map((box) => box.width)) - Math.min(...capabilityModeTabRects.map((box) => box.width)) : 0,
    capabilityModeLabelVisible: isVisible(capabilityModeLabel),
    capabilityModeLabelText: capabilityModeLabel?.textContent.trim() || '',
    capabilityAxisText: capabilityAxis?.textContent.replace(/\s+/g, ' ').trim() || '',
    combinedProfileMetricLabel: capabilityAxis?.querySelector('.score-axis-header__profile-title > span')?.textContent.trim() || '',
    combinedEffectLabel: capabilityAxis?.querySelector('.score-axis-header__effect')?.textContent.trim() || '',
    combinedConditionHintCount: capabilityAxis?.querySelectorAll('.score-axis-header__scale').length || 0,
    capabilityBrowserWidth: capabilityBrowser?.getBoundingClientRect().width || 0,
    capabilityIndexWidth: capabilityIndex?.getBoundingClientRect().width || 0,
    capabilityCanvasWidth: capabilityCanvas?.getBoundingClientRect().width || 0,
    obsoleteCapabilityBlocks: workspace?.querySelectorAll('.capability-browser__heading, .capability-winners, .capability-winner, .capability-context').length || 0,
    completeCapabilityRowsInViewport: capabilityRows.filter((row) => {
      const box = row.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight;
    }).length,
    completeCombinedRowsInViewport: combinedRows.filter((row) => {
      const box = row.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight;
    }).length,
    visibleCombinedRowsInViewport: combinedRows.filter((row) => {
      const box = row.getBoundingClientRect();
      return box.bottom > 0 && box.top < innerHeight;
    }).length,
    plotPointCount: workspace?.querySelectorAll('.capability-efficiency:not([hidden]) .plot-point[data-entry-id]').length || 0,
    efficiencySelectCount: workspace?.querySelectorAll('.capability-efficiency:not([hidden]) select:not([disabled])').length || 0,
    efficiencyQualityFieldCount: workspace?.querySelectorAll('#efficiency-score-field').length || 0,
    efficiencyTitle: workspace?.querySelector('.capability-efficiency:not([hidden]) #efficiency-field-title')?.textContent.replace(/\s+/g, ' ').trim() || '',
    efficiencyYAxis: workspace?.querySelector('.capability-efficiency:not([hidden]) .efficiency-plane__axis-label--y')?.textContent.replace(/\s+/g, ' ').trim() || '',
    hasEffectTab: Boolean(document.querySelector('[data-lens="vasir-effect"]')),
    hasEffectPanel: Boolean(document.querySelector('#panel-vasir-effect')),
    hasShowAll: Boolean(workspace?.querySelector('#show-all')),
    unexpectedKanitCount: unexpectedKanit.length,
    unexpectedKanit: unexpectedKanit.slice(0, 12).map((element) => element.className || element.tagName),
    modeTabRecords
  };
})()`
  .replace('@@CATEGORY@@', JSON.stringify(category))
  .replace('@@MODE@@', JSON.stringify(mode));

const navigationInteractionExpression = (returnCategory, returnMode) => String.raw`(async () => {
  const returnCategory = @@CATEGORY@@;
  const returnMode = @@MODE@@;
  const modes = ['models', 'benchmarks', 'efficiency'];
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const workspace = () => document.querySelector('#panel-capabilities');
  const selectCategory = async (category) => {
    document.querySelector('.capability-selector__tab[data-category-id="' + CSS.escape(category) + '"]')?.click();
    await settle();
  };
  const selectMode = async (mode) => {
    document.querySelector('.capability-mode__tab[data-capability-mode="' + CSS.escape(mode) + '"]')?.click();
    await settle();
  };
  const restore = async () => {
    await selectCategory(returnCategory);
    await selectMode(returnMode);
  };

  await selectCategory('overall');
  await selectMode('models');
  const capabilityPanel = workspace();
  const initialSelection = capabilityPanel?.getAttribute('data-selected-entry') || '';
  const alternateSetting = [...capabilityPanel?.querySelectorAll('.capability-ranking--combined .setting-row[data-full-entry-id]') || []]
    .find((row) => row.getAttribute('data-full-entry-id') !== initialSelection);
  const requestedSelection = alternateSetting?.getAttribute('data-full-entry-id') || '';
  alternateSetting?.querySelector('.setting-row__select[data-entry-id]')?.click();
  await settle();
  const persistentSelection = capabilityPanel?.getAttribute('data-selected-entry') || '';
  const selectedFixtureEntry = window.VASIR_DATA.entries.find((entry) => entry.id === persistentSelection);
  const selectionChanged = Boolean(
    requestedSelection &&
    persistentSelection === requestedSelection &&
    selectedFixtureEntry?.condition === 'full'
  );

  const modeRoutes = [];
  for (const mode of modes) {
    await selectMode(mode);
    const selected = document.querySelector('.capability-mode__tab[aria-selected="true"]');
    const panelId = selected?.getAttribute('aria-controls') || '';
    const panel = panelId ? document.getElementById(panelId) : null;
    modeRoutes.push({
      mode,
      selectedMode: selected?.getAttribute('data-capability-mode') || '',
      hash: location.hash,
      panelVisible: Boolean(panel && !panel.hidden),
      selectedEntry: workspace()?.getAttribute('data-selected-entry') || ''
    });
  }
  const selectionPersistent = modeRoutes.every((route) => route.selectedEntry === persistentSelection);

  const selectResults = [];
  await selectMode('efficiency');
  const efficiencySelectIds = [...document.querySelectorAll('#capability-efficiency:not([hidden]) select:not([disabled])')]
    .map((select) => select.id);
  for (const id of efficiencySelectIds) {
    const select = document.getElementById(id);
    if (!select) {
      selectResults.push({ id, eligible: true, exercised: false });
      continue;
    }
    const initialValue = select.value;
    const eligible = select.options.length > 1;
    let exercised = false;
    if (eligible) {
      select.selectedIndex = (select.selectedIndex + 1) % select.options.length;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
      const current = document.getElementById(select.id);
      if (current) {
        current.value = initialValue;
        current.dispatchEvent(new Event('input', { bubbles: true }));
        current.dispatchEvent(new Event('change', { bubbles: true }));
        await settle();
        exercised = current.value === initialValue;
      }
    }
    selectResults.push({ id, eligible, exercised });
  }

  await selectCategory('overall');
  await selectMode('models');
  const combinedShowAll = () => document.querySelector('#panel-capabilities .capability-ranking--combined #show-all');
  const showAll = combinedShowAll();
  const showAllBefore = {
    rows: document.querySelectorAll('#panel-capabilities .capability-ranking--combined .setting-row').length,
    text: showAll?.textContent.trim() || '',
    expanded: showAll?.getAttribute('aria-expanded') || ''
  };
  showAll?.click();
  await settle();
  const expandedShowAll = combinedShowAll();
  const showAllAfter = {
    rows: document.querySelectorAll('#panel-capabilities .capability-ranking--combined .setting-row').length,
    text: expandedShowAll?.textContent.trim() || '',
    expanded: expandedShowAll?.getAttribute('aria-expanded') || ''
  };
  const showAllChanged = Boolean(showAll) && (
    showAllAfter.rows !== showAllBefore.rows ||
    showAllAfter.text !== showAllBefore.text ||
    showAllAfter.expanded !== showAllBefore.expanded
  );
  expandedShowAll?.click();
  await settle();
  const restoredShowAll = combinedShowAll();
  const showAllRestored = Boolean(showAll) &&
    document.querySelectorAll('#panel-capabilities .capability-ranking--combined .setting-row').length === showAllBefore.rows &&
    restoredShowAll?.getAttribute('aria-expanded') === showAllBefore.expanded;

  await selectMode('efficiency');
  const plotPointCount = document.querySelectorAll('#capability-efficiency:not([hidden]) .plot-point[data-entry-id]').length;
  await restore();

  return {
    initialSelection,
    requestedSelection,
    persistentSelection,
    selectionChanged,
    selectionPersistent,
    modeRoutes,
    selects: {
      total: selectResults.length,
      eligible: selectResults.filter((result) => result.eligible).length,
      exercised: selectResults.filter((result) => result.eligible && result.exercised).length,
      failures: selectResults.filter((result) => result.eligible && !result.exercised)
    },
    showAll: {
      found: Boolean(showAll),
      changed: showAllChanged,
      restored: showAllRestored,
      before: showAllBefore,
      after: showAllAfter
    },
    plotPointCount,
    globalLensControlCount: document.querySelectorAll('.lens-navigation, .lens-tab[data-lens], #panel-efficiency').length,
    hasEffectTab: Boolean(document.querySelector('[data-lens="vasir-effect"]')),
    hasEffectPanel: Boolean(document.querySelector('#panel-vasir-effect')),
    selectedCapabilityCategory: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
    returnedMode: document.querySelector('.capability-mode__tab[role="tab"][aria-selected="true"]')?.getAttribute('data-capability-mode') || '',
    returnedHash: location.hash
  };
})()`
  .replace('@@CATEGORY@@', JSON.stringify(returnCategory))
  .replace('@@MODE@@', JSON.stringify(returnMode));

const activateCapabilityRouteExpression = (category, mode) => String.raw`(async () => {
  const category = @@CATEGORY@@;
  const mode = @@MODE@@;
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  document.querySelector('.capability-selector__tab[data-category-id="' + CSS.escape(category) + '"]')?.click();
  await settle();
  document.querySelector('.capability-mode__tab[data-capability-mode="' + CSS.escape(mode) + '"]')?.click();
  await settle();
  return {
    category: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
    mode: document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') || '',
    hash: location.hash
  };
})()`
  .replace('@@CATEGORY@@', JSON.stringify(category))
  .replace('@@MODE@@', JSON.stringify(mode));

const leaderboardCompositionExpression = (returnCategory, returnMode) => String.raw`(async () => {
  const returnCategory = @@CATEGORY@@;
  const returnMode = @@MODE@@;
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const tolerance = 0.00001;
  const scoreTolerance = 0.05;
  const number = (value) => {
    const match = String(value || '').replaceAll('−', '-').replaceAll('%', '').match(/[+-]?\d+(?:\.\d+)?/);
    const parsed = match ? Number.parseFloat(match[0]) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const closeEnough = (actual, expected, allowed = tolerance) => (
    Number.isFinite(actual) && Math.abs(actual - expected) <= allowed
  );
  const selectCategory = async (category) => {
    document.querySelector('.capability-selector__tab[data-category-id="' + CSS.escape(category) + '"]')?.click();
    await settle();
  };
  const selectMode = async (mode) => {
    document.querySelector('.capability-mode__tab[data-capability-mode="' + CSS.escape(mode) + '"]')?.click();
    await settle();
  };
  const restore = async () => {
    await selectCategory(returnCategory);
    await selectMode(returnMode);
  };
  const isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
  };
  const rankedCondition = (condition) => window.VASIR_DATA.entries
    .filter((entry) => entry.condition === condition)
    .sort((left, right) => (
      right.score - left.score ||
      left.cost - right.cost ||
      left.id.localeCompare(right.id)
    ));
  const baselineField = rankedCondition('baseline');
  const fullField = rankedCondition('full');
  const baselineRanks = new Map(baselineField.map((entry, index) => [entry.id, index + 1]));
  const fullRanks = new Map(fullField.map((entry, index) => [entry.id, index + 1]));

  const expectedContributions = (entry) => {
    const weighted = window.VASIR_DATA.categories.map((category) => {
      const rawScore = entry.categories.find((reading) => reading.category === category.id).score;
      return { category, rawScore, unscaled: rawScore * category.weight };
    });
    const total = weighted.reduce((sum, item) => sum + item.unscaled, 0);
    const scale = total > 0 ? entry.score / total : 0;
    let allocated = 0;
    return weighted.map((item, index) => {
      const contribution = index === weighted.length - 1
        ? entry.score - allocated
        : item.unscaled * scale;
      allocated += contribution;
      return { ...item, contribution };
    });
  };

  const auditComposition = (phase, composition, expectedEntry, expectedCondition, failures) => {
    const entryId = composition.getAttribute('data-entry-id') || '';
    const condition = composition.getAttribute('data-condition') || '';
    const compositeScore = number(composition.getAttribute('data-composite-score'));
    if (entryId !== expectedEntry.id) {
      failures.push(phase + ' ' + expectedEntry.settingId + ' ' + expectedCondition + ': entry ' + entryId + ' != ' + expectedEntry.id);
    }
    if (condition !== expectedCondition || expectedEntry.condition !== expectedCondition) {
      failures.push(phase + ' ' + expectedEntry.settingId + ': condition ' + condition + ' != ' + expectedCondition);
    }
    if (!closeEnough(compositeScore, expectedEntry.score)) {
      failures.push(phase + ' ' + entryId + ': composite ' + compositeScore + ' != ' + expectedEntry.score);
    }

    const segments = [...composition.querySelectorAll('.capability-composition__segment')];
    if (segments.length !== 5) failures.push(phase + ' ' + entryId + ': ' + segments.length + '/5 segments');
    const expected = expectedContributions(expectedEntry);
    const seenCategories = new Set();
    let contributionSum = 0;

    segments.forEach((segment, index) => {
      const expectedSegment = expected[index];
      const categoryId = segment.getAttribute('data-category-id') || '';
      const category = window.VASIR_DATA.categories.find((candidate) => candidate.id === categoryId);
      if (!category || seenCategories.has(categoryId)) {
        failures.push(phase + ' ' + entryId + ': invalid/duplicate category ' + (categoryId || '(missing)'));
        return;
      }
      seenCategories.add(categoryId);
      if (!expectedSegment || expectedSegment.category.id !== categoryId) {
        failures.push(phase + ' ' + entryId + ': segment ' + (index + 1) + ' order/id mismatch');
      }

      const rawScore = number(segment.getAttribute('data-raw-score'));
      const weight = number(segment.getAttribute('data-weight'));
      const contribution = number(segment.getAttribute('data-contribution'));
      const categoryDelta = number(segment.getAttribute('data-delta'));
      const baselineEntry = window.VASIR_DATA.entries.find((candidate) => candidate.id === expectedEntry.settingId + '-baseline');
      const baselineRawScore = baselineEntry?.categories.find((reading) => reading.category === categoryId)?.score;
      const expectedCategoryDelta = Math.round((rawScore - baselineRawScore) * 10) / 10;
      const visibleLabel = segment.textContent.replace(/\s+/g, ' ').trim();
      const expectedVisibleLabel = category.short + ' ' + rawScore.toFixed(1);
      contributionSum += contribution;

      if (segment.getAttribute('data-category-label') !== category.name) {
        failures.push(phase + ' ' + entryId + ' ' + categoryId + ': category label mismatch');
      }
      if (segment.getAttribute('data-category-short') !== category.short) {
        failures.push(phase + ' ' + entryId + ' ' + categoryId + ': category short label mismatch');
      }
      if (!closeEnough(rawScore, expectedSegment?.rawScore)) {
        failures.push(phase + ' ' + entryId + ' ' + categoryId + ': raw ' + rawScore + ' != ' + expectedSegment?.rawScore);
      }
      if (!closeEnough(weight, category.weight)) {
        failures.push(phase + ' ' + entryId + ' ' + categoryId + ': weight ' + weight + ' != ' + category.weight);
      }
      if (!closeEnough(contribution, expectedSegment?.contribution)) {
        failures.push(phase + ' ' + entryId + ' ' + categoryId + ': contribution ' + contribution + ' != ' + expectedSegment?.contribution);
      }
      if (!closeEnough(categoryDelta, expectedCategoryDelta)) {
        failures.push(phase + ' ' + entryId + ' ' + categoryId + ': category delta metadata ' + categoryDelta + ' != ' + expectedCategoryDelta);
      }
      if (segment.querySelector('.capability-composition__delta') || visibleLabel !== expectedVisibleLabel) {
        failures.push(
          phase + ' ' + entryId + ' ' + categoryId + ': visual label must contain only category and score; "' +
          visibleLabel + '" != "' + expectedVisibleLabel + '"'
        );
      }
    });

    if (seenCategories.size !== window.VASIR_DATA.categories.length) {
      failures.push(phase + ' ' + entryId + ': category coverage ' + seenCategories.size + '/5');
    }
    if (!closeEnough(contributionSum, compositeScore, scoreTolerance)) {
      failures.push(phase + ' ' + entryId + ': weighted contribution sum ' + contributionSum + ' != composite ' + compositeScore);
    }
    const track = composition.querySelector('.capability-composition__track');
    const trackRect = track?.getBoundingClientRect();
    const trackStyle = track ? getComputedStyle(track) : null;
    const trackBorderLeft = Number.parseFloat(trackStyle?.borderLeftWidth || '0') || 0;
    const trackBorderRight = Number.parseFloat(trackStyle?.borderRightWidth || '0') || 0;
    const segmentRects = segments.map((segment) => segment.getBoundingClientRect());
    const firstSegmentRect = segmentRects[0];
    const lastSegmentRect = segmentRects.at(-1);
    const availableWidth = Math.max(0, (trackRect?.width || 0) - trackBorderLeft - trackBorderRight);
    const trackContentLeft = (trackRect?.left || 0) + trackBorderLeft;
    const renderedWidth = lastSegmentRect
      ? lastSegmentRect.right - trackContentLeft
      : 0;
    const expectedWidth = availableWidth * compositeScore / 100;
    if (
      availableWidth <= 0 ||
      !firstSegmentRect ||
      Math.abs(firstSegmentRect.left - trackContentLeft) > 1 ||
      Math.abs(renderedWidth - expectedWidth) > 2
    ) {
      failures.push(
        phase + ' ' + entryId + ': shared 0–100 endpoint ' + renderedWidth.toFixed(1) +
        'px != ' + expectedWidth.toFixed(1) + 'px for score ' + compositeScore
      );
    }
    let cumulativeContribution = 0;
    segmentRects.forEach((segmentRect, index) => {
      const previousContribution = cumulativeContribution;
      cumulativeContribution += expected[index]?.contribution || 0;
      const expectedSegmentWidth = availableWidth * (expected[index]?.contribution || 0) / 100;
      const expectedSegmentStart = trackContentLeft + availableWidth * previousContribution / 100;
      const expectedSegmentEnd = trackContentLeft + availableWidth * cumulativeContribution / 100;
      if (
        Math.abs(segmentRect.width - expectedSegmentWidth) > 2 ||
        Math.abs(segmentRect.left - expectedSegmentStart) > 2 ||
        Math.abs(segmentRect.right - expectedSegmentEnd) > 2
      ) {
        failures.push(
          phase + ' ' + entryId + ' segment ' + (index + 1) + ': shared-scale geometry ' +
          segmentRect.left.toFixed(1) + '–' + segmentRect.right.toFixed(1) + 'px != ' +
          expectedSegmentStart.toFixed(1) + '–' + expectedSegmentEnd.toFixed(1) + 'px'
        );
      }
    });
    if (composition.querySelector('.capability-composition__baseline')) {
      failures.push(phase + ' ' + entryId + ': obsolete Minimal marker present');
    }
    return {
      entryId,
      condition,
      segmentCount: segments.length,
      contributionSum,
      compositeScore,
      availableWidth,
      renderedWidth,
      expectedWidth
    };
  };

  const auditVisibleRows = (phase) => {
    const rows = [...document.querySelectorAll('#panel-capabilities .capability-ranking--combined .setting-row')].filter(isVisible);
    const failures = [];
    const records = [];

    rows.forEach((row, rowIndex) => {
      const settingId = row.getAttribute('data-setting-id') || '';
      const setting = window.VASIR_DATA.settings.find((candidate) => candidate.id === settingId);
      const baselineEntryId = row.getAttribute('data-baseline-entry-id') || '';
      const fullEntryId = row.getAttribute('data-full-entry-id') || '';
      const baselineEntry = window.VASIR_DATA.entries.find((entry) => entry.id === baselineEntryId);
      const fullEntry = window.VASIR_DATA.entries.find((entry) => entry.id === fullEntryId);
      if (!setting || !baselineEntry || !fullEntry) {
        failures.push(phase + ' row ' + (rowIndex + 1) + ': invalid setting/baseline/full fixture mapping');
        return;
      }
      if (
        baselineEntry.id !== settingId + '-baseline' ||
        fullEntry.id !== settingId + '-full' ||
        baselineEntry.settingId !== settingId ||
        fullEntry.settingId !== settingId
      ) {
        failures.push(phase + ' ' + settingId + ': paired entry IDs do not match setting');
      }

      const expectedBaselineRank = baselineRanks.get(baselineEntry.id);
      const expectedFullRank = fullRanks.get(fullEntry.id);
      const expectedDelta = Math.round((fullEntry.score - baselineEntry.score) * 10) / 10;
      const baselineScore = number(row.getAttribute('data-baseline-score'));
      const fullScore = number(row.getAttribute('data-full-score'));
      const baselineRank = number(row.getAttribute('data-baseline-rank'));
      const fullRank = number(row.getAttribute('data-full-rank'));
      const delta = number(row.getAttribute('data-delta'));

      if (!closeEnough(baselineScore, baselineEntry.score)) {
        failures.push(phase + ' ' + settingId + ': baseline score ' + baselineScore + ' != ' + baselineEntry.score);
      }
      if (!closeEnough(fullScore, fullEntry.score)) {
        failures.push(phase + ' ' + settingId + ': full score ' + fullScore + ' != ' + fullEntry.score);
      }
      if (baselineRank !== expectedBaselineRank) {
        failures.push(phase + ' ' + settingId + ': baseline rank ' + baselineRank + ' != ' + expectedBaselineRank);
      }
      if (fullRank !== expectedFullRank) {
        failures.push(phase + ' ' + settingId + ': full rank ' + fullRank + ' != ' + expectedFullRank);
      }
      if (!closeEnough(delta, expectedDelta)) {
        failures.push(phase + ' ' + settingId + ': delta ' + delta + ' != ' + expectedDelta);
      }
      if (fullEntryId !== fullField[rowIndex]?.id || fullRank !== rowIndex + 1) {
        failures.push(phase + ' ' + settingId + ': row order does not follow Full rank ' + (rowIndex + 1));
      }

      const deltaElement = row.querySelector('.setting-row__delta');
      const deltaValueElement = deltaElement?.querySelector('strong');
      const totalElements = [...row.querySelectorAll('.capability-composition__total')];
      const visibleDelta = number(deltaElement?.textContent);
      if (!isVisible(deltaElement)) failures.push(phase + ' ' + settingId + ': delta is not visible');
      if (!closeEnough(visibleDelta, expectedDelta)) {
        failures.push(phase + ' ' + settingId + ': visible delta ' + visibleDelta + ' != ' + expectedDelta);
      }
      const deltaFontSize = deltaValueElement
        ? parseFloat(getComputedStyle(deltaValueElement).fontSize)
        : Number.NaN;
      const totalFontSizes = totalElements.map((element) => parseFloat(getComputedStyle(element).fontSize));
      if (
        totalElements.length !== 2 ||
        !Number.isFinite(deltaFontSize) ||
        totalFontSizes.some((fontSize) => !Number.isFinite(fontSize) || fontSize < deltaFontSize + 2)
      ) {
        failures.push(
          phase + ' ' + settingId + ': overall scores must be at least 2px larger than uplift; scores ' +
          totalFontSizes.join(', ') + 'px vs uplift ' + deltaFontSize + 'px'
        );
      }

      const compositions = [...row.querySelectorAll('.capability-composition')];
      if (compositions.length !== 2) {
        failures.push(phase + ' ' + settingId + ': ' + compositions.length + '/2 composition roots');
      }
      if (
        compositions[0]?.getAttribute('data-condition') !== 'full' ||
        compositions[1]?.getAttribute('data-condition') !== 'baseline'
      ) {
        failures.push(phase + ' ' + settingId + ': composition DOM order must be Full then Baseline');
      }
      const baselineComposition = compositions.find((root) => root.getAttribute('data-condition') === 'baseline');
      const fullComposition = compositions.find((root) => root.getAttribute('data-condition') === 'full');
      if (!baselineComposition || !fullComposition) {
        failures.push(phase + ' ' + settingId + ': missing baseline/full composition');
      } else {
        const baselineRecord = auditComposition(phase, baselineComposition, baselineEntry, 'baseline', failures);
        const fullRecord = auditComposition(phase, fullComposition, fullEntry, 'full', failures);
        const expectedEndpointDelta = fullRecord.availableWidth * expectedDelta / 100;
        const renderedEndpointDelta = fullRecord.renderedWidth - baselineRecord.renderedWidth;
        if (Math.abs(renderedEndpointDelta - expectedEndpointDelta) > 2) {
          failures.push(
            phase + ' ' + settingId + ': paired endpoint delta ' + renderedEndpointDelta.toFixed(1) +
            'px != ' + expectedEndpointDelta.toFixed(1) + 'px for uplift ' + expectedDelta
          );
        }
        records.push({
          settingId,
          baselineEntryId,
          fullEntryId,
          baselineRank,
          fullRank,
          delta,
          compositions: [baselineRecord, fullRecord]
        });
      }
    });

    return { phase, rowCount: rows.length, checkedCount: records.length, records, failures };
  };

  await selectCategory('overall');
  await selectMode('models');
  const combinedShowAll = () => document.querySelector('#panel-capabilities .capability-ranking--combined #show-all');
  let showAll = combinedShowAll();
  if (showAll?.getAttribute('aria-expanded') === 'true') {
    showAll.click();
    await settle();
    showAll = combinedShowAll();
  }
  const collapsed = auditVisibleRows('collapsed');
  showAll?.click();
  await settle();
  const expanded = auditVisibleRows('expanded');
  const obsoleteBaselineCount = document.querySelectorAll('.capability-composition__baseline').length;
  combinedShowAll()?.click();
  await settle();
  const restoredRows = [...document.querySelectorAll('#panel-capabilities .capability-ranking--combined .setting-row')].filter(isVisible).length;
  await restore();

  return {
    collapsed,
    expanded,
    obsoleteBaselineCount,
    showAllFound: Boolean(showAll),
    restoredRows,
    returnedMode: document.querySelector('.capability-mode__tab[role="tab"][aria-selected="true"]')?.getAttribute('data-capability-mode') || '',
    returnedHash: location.hash
  };
})()`
  .replace('@@CATEGORY@@', JSON.stringify(returnCategory))
  .replace('@@MODE@@', JSON.stringify(returnMode));

const capabilityAuditExpression = (returnCategory, returnMode) => String.raw`(async () => {
  const returnCategory = @@CATEGORY@@;
  const returnMode = @@MODE@@;
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const categories = window.VASIR_DATA.categories;
  const fields = [{ id: 'overall', name: 'Combined' }, ...categories];
  const entries = window.VASIR_DATA.entries;
  const number = (value) => {
    const match = String(value || '').replaceAll('−', '-').replaceAll('%', '').match(/[+-]?\d+(?:\.\d+)?/);
    const parsed = match ? Number.parseFloat(match[0]) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const closeEnough = (actual, expected, tolerance = 0.05) => (
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance
  );
  const scoreFor = (entry, categoryId) => categoryId === 'overall'
    ? entry.score
    : entry.categories.find((reading) => reading.category === categoryId)?.score;
  const routeFor = (category, mode) => '#capabilities/' + category + (mode === 'models' ? '' : '/' + mode);
  const selectCategory = async (category) => {
    document.querySelector('.capability-selector__tab[data-category-id="' + CSS.escape(category) + '"]')?.click();
    await settle();
  };
  const selectMode = async (mode) => {
    document.querySelector('.capability-mode__tab[data-capability-mode="' + CSS.escape(mode) + '"]')?.click();
    await settle();
  };
  const ranking = (condition, categoryId) => entries
    .filter((entry) => entry.condition === condition)
    .sort((left, right) => (
      scoreFor(right, categoryId) - scoreFor(left, categoryId) ||
      right.score - left.score ||
      left.cost - right.cost ||
      left.id.localeCompare(right.id)
    ));

  const auditCategory = async (category) => {
    const selector = document.querySelector('.capability-selector__tab[data-category-id="' + CSS.escape(category.id) + '"]');
    selector?.click();
    await settle();
    const failures = [];
    const selectors = [...document.querySelectorAll('#panel-capabilities .capability-selector__tab[data-category-id]')];
    const selectedSelectors = selectors.filter((candidate) => candidate.getAttribute('aria-selected') === 'true');
    const baselineField = ranking('baseline', category.id);
    const fullField = ranking('full', category.id);
    const baselineRanks = new Map(baselineField.map((entry, index) => [entry.id, index + 1]));
    const fullRanks = new Map(fullField.map((entry, index) => [entry.id, index + 1]));

    if (selectors.length !== 6 || selectedSelectors.length !== 1 || selectedSelectors[0]?.getAttribute('data-category-id') !== category.id) {
      failures.push('selector state ' + selectors.length + '/6, selected ' + (selectedSelectors[0]?.getAttribute('data-category-id') || '(none)'));
    }
    const selectorList = document.querySelector('#panel-capabilities .capability-selector__tabs');
    if (selectorList && selectorList.scrollWidth > selectorList.clientWidth && selectedSelectors[0]) {
      const listBox = selectorList.getBoundingClientRect();
      const selectedBox = selectedSelectors[0].getBoundingClientRect();
      if (selectedBox.left < listBox.left - 1 || selectedBox.right > listBox.right + 1) {
        failures.push(category.id + ' selected capability is outside the horizontal viewport');
      }
    }
    const selectorHeader = document.querySelector('#panel-capabilities .capability-selector__header');
    const selectorHeaderText = selectorHeader?.textContent.replace(/\s+/g, ' ').trim() || '';
    if (!/^Capabilities\b/i.test(selectorHeaderText) || !selectorHeaderText.includes('Best with Vasir /100')) {
      failures.push('selector caption mismatch: ' + selectorHeaderText);
    }
    if (selectorHeader?.querySelectorAll('.condition-mark--full').length !== 1) failures.push('selector caption Full marker mismatch');
    selectors.forEach((candidate) => {
      const candidateCategory = candidate.getAttribute('data-category-id') || '';
      const expectedWinner = ranking('full', candidateCategory)[0];
      const expectedScore = scoreFor(expectedWinner, candidateCategory);
      const box = candidate.getBoundingClientRect();
      if (candidate.tagName !== 'BUTTON' || candidate.getAttribute('role') !== 'tab') failures.push(candidateCategory + ' selector is not a native tab button');
      if (box.height < 43.99) failures.push(candidateCategory + ' selector height ' + box.height.toFixed(1));
      if (candidate.getAttribute('data-winner-entry-id') !== expectedWinner.id) failures.push(candidateCategory + ' winner entry mismatch');
      if (!closeEnough(number(candidate.getAttribute('data-winner-score')), expectedScore)) failures.push(candidateCategory + ' winner score mismatch');
      if (candidate.getAttribute('data-winner-condition') !== 'full') failures.push(candidateCategory + ' selector winner is not Full');
      if (!closeEnough(number(candidate.querySelector(':scope > strong')?.textContent), expectedScore) || !candidate.querySelector(':scope > strong')?.textContent.includes('/100')) failures.push(candidateCategory + ' visible score /100 mismatch');
      const accessibleLabel = candidate.getAttribute('aria-label') || '';
      if (!accessibleLabel.includes(expectedWinner.family) || !accessibleLabel.toLowerCase().includes(expectedWinner.reasoning.toLowerCase())) failures.push(candidateCategory + ' champion missing from accessible label');
      if (candidate.querySelector('.capability-selector__champion, .capability-selector__score-label')) failures.push(candidateCategory + ' crowded selector metadata remains');
      const viewing = candidate.querySelector('.capability-selector__state')?.textContent.trim() || '';
      if ((candidate === selectedSelectors[0] && viewing !== 'Selected') || (candidate !== selectedSelectors[0] && viewing)) failures.push(candidateCategory + ' selected-state mismatch');
    });

    const question = document.querySelector('#capability-question')?.textContent.trim() || '';
    if (!question.includes(category.name)) failures.push('question does not name ' + category.name);
    if (location.hash !== '#capabilities/' + category.id) failures.push('hash ' + location.hash);

    const isCombined = category.id === 'overall';
    const showAll = document.querySelector('#panel-capabilities .capability-ranking--combined #show-all');
    if (isCombined && showAll?.getAttribute('aria-expanded') === 'true') {
      showAll.click();
      await settle();
    }

    const canvasHeader = document.querySelector('#panel-capabilities .capability-canvas__header');
    const readings = [...canvasHeader?.querySelectorAll('.capability-canvas__reading') || []];
    const fullBest = canvasHeader?.querySelector('.capability-canvas__reading--full');
    const baselineBest = canvasHeader?.querySelector('.capability-canvas__reading--baseline');
    const effectSummary = canvasHeader?.querySelector('.capability-canvas__reading--effect');
    const outcomesSummary = canvasHeader?.querySelector('.capability-canvas__reading--outcomes');
    const headerText = canvasHeader?.textContent.replace(/\s+/g, ' ').trim() || '';
    const axis = document.querySelector(isCombined
      ? '#panel-capabilities .capability-ranking--combined .score-axis-header'
      : '#panel-capabilities .capability-ranking:not(.capability-ranking--combined) .capability-ranking__axis');
    const axisText = axis?.textContent.replace(/\s+/g, ' ').trim() || '';
    const expectedReadingCount = isCombined ? 3 : 2;
    if (readings.length !== expectedReadingCount) failures.push('summary readings ' + readings.length + '/' + expectedReadingCount);
    if (
      fullBest?.getAttribute('data-entry-id') !== fullField[0].id ||
      !closeEnough(number(fullBest?.getAttribute('data-score')), scoreFor(fullField[0], category.id)) ||
      !closeEnough(number(fullBest?.querySelector('dd')?.textContent), scoreFor(fullField[0], category.id))
    ) {
      failures.push('With Vasir leader summary mismatch');
    }

    if (isCombined) {
      const deltas = fullField
        .map((fullEntry) => {
          const baselineEntry = entries.find((entry) => entry.id === fullEntry.settingId + '-baseline');
          return Math.round((fullEntry.score - baselineEntry.score) * 10) / 10;
        })
        .sort((left, right) => left - right);
      const midpoint = Math.floor(deltas.length / 2);
      const median = deltas.length % 2
        ? deltas[midpoint]
        : Math.round(((deltas[midpoint - 1] + deltas[midpoint]) / 2) * 10) / 10;
      const improved = deltas.filter((delta) => delta > 0).length;
      const regressed = deltas.filter((delta) => delta < 0).length;
      if (!headerText.includes(category.name) || !headerText.includes('20 matched settings') || !headerText.includes('Best with Vasir') || !headerText.includes('Median uplift') || !headerText.includes('Improved settings')) {
        failures.push('Combined canvas header copy mismatch: ' + headerText);
      }
      const profileMetricLabel = axis?.querySelector('.score-axis-header__profile-title > span')?.textContent.trim() || '';
      const effectLabel = axis?.querySelector('.score-axis-header__effect')?.textContent.trim() || '';
      const redundantConditionHints = axis?.querySelectorAll('.score-axis-header__scale').length || 0;
      const staleAxisCopy = /Shared scale|Without shown below|With Vasir above|Overall uplift/i.test(axisText);
      if (
        !/Rank \/ model setting/i.test(axisText) ||
        !/Capability scores/i.test(axisText) ||
        profileMetricLabel !== 'Overall' ||
        effectLabel !== 'Uplift' ||
        redundantConditionHints !== 0 ||
        staleAxisCopy
      ) {
        failures.push('Combined axis labels mismatch: ' + axisText);
      }
      if (baselineBest) failures.push('Combined header repeats Best without summary');
      if (
        !closeEnough(number(effectSummary?.getAttribute('data-median')), median) ||
        !closeEnough(number(effectSummary?.querySelector('dd')?.textContent), median)
      ) failures.push('Combined median effect summary mismatch');
      if (
        number(outcomesSummary?.getAttribute('data-improved')) !== improved ||
        number(outcomesSummary?.getAttribute('data-regressed')) !== regressed ||
        !outcomesSummary?.textContent.includes(improved + ' of ' + deltas.length) ||
        !outcomesSummary?.textContent.includes(regressed + ' regressed')
      ) failures.push('Combined outcomes summary mismatch');
    } else {
      if (!headerText.includes(category.name) || !headerText.includes('20 matched settings') || !headerText.includes('Leader with Vasir') || !headerText.includes('Best without')) {
        failures.push('canvas header copy mismatch: ' + headerText);
      }
      if (!/Rank \/ model/i.test(axisText) || !/Without/i.test(axisText) || !/With/i.test(axisText) || !/Change/i.test(axisText)) {
        failures.push('axis labels mismatch: ' + axisText);
      }
      if (
        baselineBest?.getAttribute('data-entry-id') !== baselineField[0].id ||
        !closeEnough(number(baselineBest?.getAttribute('data-score')), scoreFor(baselineField[0], category.id)) ||
        !closeEnough(number(baselineBest?.querySelector('dd')?.textContent), scoreFor(baselineField[0], category.id))
      ) failures.push('Best without summary mismatch');
    }
    if (document.querySelectorAll('#panel-capabilities .capability-browser__heading, #panel-capabilities .capability-winners, #panel-capabilities .capability-winner, #panel-capabilities .capability-context').length) {
      failures.push('obsolete question/selection or winner strip remains');
    }

    const pairedRows = [...document.querySelectorAll('#panel-capabilities .capability-ranking--combined .setting-row[data-setting-id]')];
    const dotRows = [...document.querySelectorAll('#panel-capabilities .capability-ranking:not(.capability-ranking--combined) .capability-rank-row[data-setting-id]')];
    const rows = isCombined ? pairedRows : dotRows;
    const expectedRows = isCombined ? 10 : 20;
    if (rows.length !== expectedRows) failures.push('rows ' + rows.length + '/' + expectedRows);
    if (isCombined && dotRows.length) failures.push('Combined leaked ' + dotRows.length + ' dot rows');
    if (!isCombined && pairedRows.length) failures.push(category.id + ' leaked ' + pairedRows.length + ' paired rows');
    if (isCombined && !showAll) failures.push('Combined show-all disclosure missing');
    if (!isCombined && document.querySelector('#panel-capabilities #show-all')) failures.push(category.id + ' unexpectedly has show-all disclosure');

    rows.forEach((row, index) => {
      const expectedFull = fullField[index];
      const expectedBaseline = entries.find((entry) => entry.id === expectedFull.settingId + '-baseline');
      const expectedBaselineScore = scoreFor(expectedBaseline, category.id);
      const expectedFullScore = scoreFor(expectedFull, category.id);
      const expectedBaselineRank = baselineRanks.get(expectedBaseline.id);
      const expectedFullRank = fullRanks.get(expectedFull.id);
      const expectedDelta = Math.round((expectedFullScore - expectedBaselineScore) * 10) / 10;
      const prefix = category.id + ' row ' + (index + 1) + ' ' + expectedFull.settingId + ': ';

      if (row.getAttribute('data-setting-id') !== expectedFull.settingId) failures.push(prefix + 'setting/order mismatch');
      if (row.getAttribute('data-full-entry-id') !== expectedFull.id || row.getAttribute('data-baseline-entry-id') !== expectedBaseline.id) failures.push(prefix + 'paired IDs mismatch');
      if (!closeEnough(number(row.getAttribute('data-full-score')), expectedFullScore)) failures.push(prefix + 'Full score mismatch');
      if (!closeEnough(number(row.getAttribute('data-baseline-score')), expectedBaselineScore)) failures.push(prefix + 'Baseline score mismatch');
      if (number(row.getAttribute('data-full-rank')) !== expectedFullRank || number(row.getAttribute('data-baseline-rank')) !== expectedBaselineRank) failures.push(prefix + 'condition rank mismatch');
      if (!closeEnough(number(row.getAttribute('data-delta')), expectedDelta)) failures.push(prefix + 'delta mismatch');

      if (isCombined) {
        const compositions = [...row.querySelectorAll('.capability-composition')];
        if (row.querySelectorAll('.setting-row__select[type="button"]').length !== 1) failures.push(prefix + 'native selection control mismatch');
        if (compositions.length !== 2 || compositions[0]?.getAttribute('data-condition') !== 'full' || compositions[1]?.getAttribute('data-condition') !== 'baseline') failures.push(prefix + 'paired composition mismatch');
        if (!closeEnough(number(row.querySelector('.setting-row__delta')?.textContent), expectedDelta)) failures.push(prefix + 'visible delta mismatch');
        return;
      }

      if (!closeEnough(number(row.style.getPropertyValue('--full-score')), expectedFullScore) || !closeEnough(number(row.style.getPropertyValue('--baseline-score')), expectedBaselineScore)) failures.push(prefix + 'marker position mismatch');
      const baselineMarkers = row.querySelectorAll('.capability-rank-row__marker--baseline');
      const fullMarkers = row.querySelectorAll('.capability-rank-row__marker--full');
      if (baselineMarkers.length !== 1 || fullMarkers.length !== 1) failures.push(prefix + 'markers ' + baselineMarkers.length + '/' + fullMarkers.length);
      const track = row.querySelector('.capability-rank-row__track');
      const connector = row.querySelector('.capability-rank-row__connector');
      if (!track || !connector || baselineMarkers.length !== 1 || fullMarkers.length !== 1) {
        failures.push(prefix + 'dumbbell geometry unavailable');
      } else {
        const trackBox = track.getBoundingClientRect();
        const connectorBox = connector.getBoundingClientRect();
        const baselineBox = baselineMarkers[0].getBoundingClientRect();
        const fullBox = fullMarkers[0].getBoundingClientRect();
        const baselineCenter = baselineBox.left + (baselineBox.width / 2);
        const fullCenter = fullBox.left + (fullBox.width / 2);
        const expectedBaselineCenter = trackBox.left + ((expectedBaselineScore / 100) * trackBox.width);
        const expectedFullCenter = trackBox.left + ((expectedFullScore / 100) * trackBox.width);
        const expectedConnectorLeft = Math.min(expectedBaselineCenter, expectedFullCenter);
        const expectedConnectorRight = Math.max(expectedBaselineCenter, expectedFullCenter);
        const connectorStyle = getComputedStyle(connector);
        if (
          connectorBox.height < 5.5 ||
          Number.parseFloat(connectorStyle.borderTopWidth) < 0.9 ||
          Number.parseFloat(connectorStyle.borderBottomWidth) < 0.9
        ) failures.push(prefix + 'comparison connector is not a high-contrast 6px band');
        if (
          Math.abs(baselineCenter - expectedBaselineCenter) > 1.25 ||
          Math.abs(fullCenter - expectedFullCenter) > 1.25 ||
          Math.abs(connectorBox.left - expectedConnectorLeft) > 1.25 ||
          Math.abs(connectorBox.right - expectedConnectorRight) > 1.25
        ) failures.push(prefix + 'dumbbell is not aligned to the shared 0–100 scale');
      }
      if (row.querySelector('[class*="skill"], [data-condition="skill"]')) failures.push(prefix + 'isolated Skill leaked into row');
      const rowReadings = [...row.querySelectorAll('.capability-rank-row__reading strong')].map((reading) => number(reading.textContent));
      if (!closeEnough(rowReadings[0], expectedBaselineScore) || !closeEnough(rowReadings[1], expectedFullScore)) failures.push(prefix + 'visible exact scores mismatch');
      const visibleRanks = [...row.querySelectorAll('.capability-rank-row__reading small')].map((reading) => number(reading.textContent));
      if (visibleRanks[0] !== expectedBaselineRank || visibleRanks[1] !== expectedFullRank) failures.push(prefix + 'visible condition ranks mismatch');
      if (number(row.querySelector('.capability-rank-row__position')?.textContent) !== expectedFullRank) failures.push(prefix + 'visible primary rank mismatch');
      const modelText = row.querySelector('.capability-rank-row__model')?.textContent.replace(/\s+/g, ' ').trim() || '';
      if (!modelText.includes(expectedFull.family) || !modelText.toLowerCase().includes(expectedFull.reasoning.toLowerCase())) failures.push(prefix + 'model/reasoning identity mismatch');
      const conditionLabels = [...row.querySelectorAll('.capability-rank-row__condition-label')];
      const visibleConditionLabels = conditionLabels.filter((label) => getComputedStyle(label).display !== 'none');
      if (innerWidth <= 832 && visibleConditionLabels.length !== 2) failures.push(prefix + 'compact condition labels ' + visibleConditionLabels.length + '/2');
      if (innerWidth > 832 && visibleConditionLabels.length !== 0) failures.push(prefix + 'desktop repeats row condition labels');
      if (!closeEnough(number(row.querySelector('.capability-rank-row__delta')?.textContent), expectedDelta)) failures.push(prefix + 'visible delta mismatch');
    });

    return { category: category.id, rowKind: isCombined ? 'paired' : 'dot', rowCount: rows.length, headerReadingCount: readings.length, failures };
  };

  document.querySelector('.capability-mode__tab[data-capability-mode="models"]')?.click();
  await settle();
  const initialSelection = document.querySelector('#panel-capabilities')?.getAttribute('data-selected-entry') || '';
  const categoryAudits = [];
  for (const category of fields) categoryAudits.push(await auditCategory(category));
  const selectionAfterCategories = document.querySelector('#panel-capabilities')?.getAttribute('data-selected-entry') || '';

  document.querySelector('.capability-selector__tab[data-category-id="engineering"]')?.click();
  await settle();
  const engineeringTab = document.querySelector('.capability-selector__tab[data-category-id="engineering"]');
  engineeringTab?.focus();
  const categoryOrientation = engineeringTab?.closest('[role="tablist"]')?.getAttribute('aria-orientation') || 'horizontal';
  const categoryAdvanceKey = categoryOrientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  engineeringTab?.dispatchEvent(new KeyboardEvent('keydown', { key: categoryAdvanceKey, bubbles: true }));
  await settle();
  const categoryKeyboard = {
    orientation: categoryOrientation,
    advanceKey: categoryAdvanceKey,
    afterArrow: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
    focusedAfterArrow: document.activeElement?.getAttribute?.('data-category-id') || '',
    hashAfterArrow: location.hash
  };
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  await settle();
  categoryKeyboard.afterHome = document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '';
  categoryKeyboard.focusedAfterHome = document.activeElement?.getAttribute?.('data-category-id') || '';
  categoryKeyboard.hashAfterHome = location.hash;

  await selectCategory('overall');
  await selectMode('models');
  const selectedRow = document.querySelector('.setting-row[data-full-entry-id="' + CSS.escape(initialSelection) + '"]') || document.querySelector('.setting-row[data-full-entry-id]');
  const selectedFullId = selectedRow?.getAttribute('data-full-entry-id') || '';
  const selectedSettingId = selectedRow?.getAttribute('data-setting-id') || '';
  const segmentSemantics = ['full', 'baseline'].map((condition) => {
    const segments = [...selectedRow?.querySelectorAll('.capability-composition--' + condition + ' .capability-composition__segment') || []];
    const record = {
      condition,
      count: segments.length,
      nativeButtons: segments.filter((segment) => segment.tagName === 'BUTTON' && segment.type === 'button').length,
      toolbarCount: selectedRow?.querySelectorAll('.capability-composition--' + condition + ' [role="toolbar"]').length || 0,
      rovingZeroCount: segments.filter((segment) => segment.tabIndex === 0).length,
      minimumWidth: segments.length ? Math.min(...segments.map((segment) => segment.getBoundingClientRect().width)) : 0,
      minimumHeight: segments.length ? Math.min(...segments.map((segment) => segment.getBoundingClientRect().height)) : 0
    };
    segments[0]?.focus();
    segments[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    record.focusedAfterArrow = document.activeElement?.getAttribute?.('data-category-id') || '';
    record.stayedOnCombined = (
      document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') === 'overall' &&
      document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') === 'models'
    );
    return record;
  });

  const drilldowns = [];
  for (const category of categories) {
    for (const condition of ['full', 'baseline']) {
      const row = document.querySelector('.setting-row[data-full-entry-id="' + CSS.escape(selectedFullId) + '"]');
      const segment = row?.querySelector('.capability-composition--' + condition + ' .capability-composition__segment[data-category-id="' + CSS.escape(category.id) + '"]');
      const nativeButton = segment?.tagName === 'BUTTON' && segment.type === 'button';
      segment?.click();
      await settle();
      drilldowns.push({
        category: category.id,
        condition,
        nativeButton,
        mode: document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') || '',
        hash: location.hash,
        selectedEntry: document.querySelector('#panel-capabilities')?.getAttribute('data-selected-entry') || '',
        selectedCategory: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
        selectedSettingVisible: Boolean(document.querySelector('.capability-rank-row.is-selected[data-setting-id="' + CSS.escape(selectedSettingId) + '"]')),
        questionFocused: document.activeElement?.id === 'capability-question'
      });
      await selectCategory('overall');
      await selectMode('models');
    }
  }

  location.hash = '#leaderboard';
  await settle();
  await settle();
  const legacyLeaderboardRoute = {
    hash: location.hash,
    selectedCategory: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
    selectedMode: document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') || '',
    hasLeaderboardTab: Boolean(document.querySelector('[data-lens="leaderboard"]')),
    hasLeaderboardPanel: Boolean(document.querySelector('#panel-leaderboard')),
    hasGlobalLensNavigation: Boolean(document.querySelector('.lens-navigation, .lens-tab[data-lens], #panel-efficiency'))
  };

  location.hash = '#vasir-effect';
  await settle();
  await settle();
  const legacyRoute = {
    hash: location.hash,
    selectedCategory: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
    hasEffectTab: Boolean(document.querySelector('.lens-tab[data-lens="vasir-effect"]')),
    hasEffectPanel: Boolean(document.querySelector('#panel-vasir-effect'))
  };

  location.hash = '#capabilities';
  await settle();
  await settle();
  const bareCapabilitiesRoute = {
    hash: location.hash,
    selectedCategory: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
    selectedMode: document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') || ''
  };

  location.hash = '#unknown-capture-route';
  await settle();
  await settle();
  const invalidRoute = {
    hash: location.hash,
    selectedCategory: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
    selectedMode: document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') || ''
  };

  location.hash = '#efficiency';
  await settle();
  await settle();
  const legacyEfficiencyRoute = {
    hash: location.hash,
    selectedCategory: document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') || '',
    selectedMode: document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') || '',
    hasStandaloneEfficiencyPanel: Boolean(document.querySelector('#panel-efficiency'))
  };

  await selectCategory(returnCategory);
  await selectMode(returnMode);
  return {
    initialSelection,
    selectionAfterCategories,
    categoryAudits,
    categoryKeyboard,
    segmentSemantics,
    drilldowns,
    legacyLeaderboardRoute,
    legacyRoute,
    legacyEfficiencyRoute,
    bareCapabilitiesRoute,
    invalidRoute,
    returnedMode: document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') || '',
    returnedHash: location.hash,
    expectedReturnedHash: routeFor(returnCategory, returnMode)
  };
})()`
  .replace('@@CATEGORY@@', JSON.stringify(returnCategory))
  .replace('@@MODE@@', JSON.stringify(returnMode));

const capabilityBenchmarkAuditExpression = (returnCategory, returnMode) => String.raw`(async () => {
  const returnCategory = @@CATEGORY@@;
  const returnMode = @@MODE@@;
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const data = window.VASIR_DATA;
  const expectedTestCounts = { engineering: 5, games: 5, product: 5, writing: 4, workflows: 5 };
  const expectedMeasuredEngineering = ['hyper-scale-chat', 'personalized-home-feed', 'device-telemetry'];
  const number = (value) => {
    const match = String(value || '').replaceAll('−', '-').replaceAll('%', '').match(/[+-]?\d+(?:\.\d+)?/);
    const parsed = match ? Number.parseFloat(match[0]) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const closeEnough = (actual, expected, tolerance = 0.05) => (
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance
  );
  const text = (element) => element?.textContent.replace(/\s+/g, ' ').trim() || '';
  const selectCategory = async (categoryId) => {
    document.querySelector('.capability-selector__tab[data-category-id="' + CSS.escape(categoryId) + '"]')?.click();
    await settle();
  };
  const selectMode = async (mode) => {
    document.querySelector('.capability-mode__tab[data-capability-mode="' + CSS.escape(mode) + '"]')?.click();
    await settle();
  };
  const modeState = () => {
    const tabs = [...document.querySelectorAll('#panel-capabilities .capability-mode__tab[data-capability-mode]')];
    const selected = tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true');
    const controlledId = selected[0]?.getAttribute('aria-controls') || '';
    return {
      count: tabs.length,
      nativeButtons: tabs.filter((tab) => tab.tagName === 'BUTTON' && tab.type === 'button').length,
      roles: tabs.map((tab) => tab.getAttribute('role') || ''),
      selectedCount: selected.length,
      selectedMode: selected[0]?.getAttribute('data-capability-mode') || '',
      rovingZeroCount: tabs.filter((tab) => tab.tabIndex === 0).length,
      tabIndexes: Object.fromEntries(tabs.map((tab) => [tab.getAttribute('data-capability-mode'), tab.tabIndex])),
      focusedMode: document.activeElement?.getAttribute?.('data-capability-mode') || '',
      controlledId,
      controlledPanelExists: Boolean(controlledId && document.getElementById(controlledId)),
      hash: location.hash
    };
  };

  const auditCategory = async (category) => {
    await selectCategory(category.id);
    await selectMode('benchmarks');
    const failures = [];
    const expectedBenchmarks = data.benchmarks.filter((benchmark) => benchmark.category === category.id);
    const expectedSuites = [...new Set(expectedBenchmarks.map((benchmark) => benchmark.suite))];
    const expectedSummaries = expectedBenchmarks.map((benchmark) => (
      data.benchmarkSummaries.find((summary) => summary.benchmarkId === benchmark.id)
    ));
    const mode = modeState();
    const ledger = document.querySelector('#panel-capabilities #capability-benchmarks.benchmark-ledger');
    const tracks = [...ledger?.querySelectorAll('.benchmark-ledger__track') || []];
    const rows = [...ledger?.querySelectorAll('.benchmark-ledger__row[data-benchmark-id]') || []];

    if (expectedBenchmarks.length !== expectedTestCounts[category.id]) {
      failures.push('fixture test count ' + expectedBenchmarks.length + ' != contract ' + expectedTestCounts[category.id]);
    }
    if (
      mode.count !== 3 ||
      mode.nativeButtons !== 3 ||
      mode.roles.some((role) => role !== 'tab') ||
      mode.selectedCount !== 1 ||
      mode.selectedMode !== 'benchmarks' ||
      mode.rovingZeroCount !== 1 ||
      mode.tabIndexes.models !== -1 ||
      mode.tabIndexes.benchmarks !== 0 ||
      mode.tabIndexes.efficiency !== -1 ||
      mode.controlledId !== 'capability-benchmarks' ||
      !mode.controlledPanelExists
    ) {
      failures.push('benchmark mode tab semantics ' + JSON.stringify(mode));
    }
    if (location.hash !== '#capabilities/' + category.id + '/benchmarks') failures.push('benchmark route ' + location.hash);
    if (!ledger || ledger.getAttribute('role') !== 'tabpanel' || ledger.getAttribute('aria-labelledby') !== 'capability-mode-benchmarks') {
      failures.push('benchmark ledger panel semantics');
    }
    if (tracks.length !== expectedSuites.length) failures.push('tracks ' + tracks.length + '/' + expectedSuites.length);
    if (rows.length !== expectedBenchmarks.length) failures.push('tests ' + rows.length + '/' + expectedBenchmarks.length);

    tracks.forEach((track, trackIndex) => {
      const expectedSuite = expectedSuites[trackIndex];
      const expectedIds = expectedBenchmarks
        .filter((benchmark) => benchmark.suite === expectedSuite)
        .map((benchmark) => benchmark.id);
      const actualIds = [...track.querySelectorAll('.benchmark-ledger__row[data-benchmark-id]')]
        .map((row) => row.getAttribute('data-benchmark-id'));
      if (text(track.querySelector('.benchmark-ledger__track-header h4')) !== expectedSuite) {
        failures.push('track ' + (trackIndex + 1) + ' title/order mismatch');
      }
      if (actualIds.join('|') !== expectedIds.join('|')) {
        failures.push('track ' + expectedSuite + ' test order ' + actualIds.join(',') + ' != ' + expectedIds.join(','));
      }
    });

    const actualOrder = rows.map((row) => row.getAttribute('data-benchmark-id'));
    const expectedOrder = expectedBenchmarks.map((benchmark) => benchmark.id);
    if (actualOrder.join('|') !== expectedOrder.join('|')) failures.push('ledger order ' + actualOrder.join(','));

    rows.forEach((row, index) => {
      const benchmark = expectedBenchmarks[index];
      const summary = expectedSummaries[index];
      const prefix = category.id + ' test ' + (index + 1) + ' ' + (benchmark?.id || '(missing)') + ': ';
      if (!benchmark || !summary) {
        failures.push(prefix + 'missing fixture/summary');
        return;
      }
      const comparisonGroups = [...row.querySelectorAll('.benchmark-ledger__comparison > span')];
      const baselineLabel = text(comparisonGroups[0]?.querySelector('small'));
      const treatmentLabel = text(comparisonGroups[1]?.querySelector('small'));
      const baselineScore = number(comparisonGroups[0]?.querySelector('strong')?.textContent);
      const treatmentScore = number(comparisonGroups[1]?.querySelector('strong')?.textContent);
      const delta = number(row.querySelector('.benchmark-ledger__comparison > b')?.textContent);
      const evidence = row.querySelector('.benchmark-ledger__evidence');
      const evidenceSpans = [...evidence?.querySelectorAll(':scope > span') || []].map(text);
      const action = text(row.querySelector('.benchmark-ledger__action'));
      const expectedAction = summary.evidenceKind === 'development' ? 'Open report →' : 'Preview test design →';

      if (row.tagName !== 'A') failures.push(prefix + 'row is not a native link');
      if (row.getAttribute('data-benchmark-id') !== benchmark.id) failures.push(prefix + 'benchmark id mismatch');
      if (row.getAttribute('data-evidence-kind') !== summary.evidenceKind || benchmark.evidenceKind !== summary.evidenceKind) failures.push(prefix + 'evidence kind mismatch');
      if (!closeEnough(number(row.getAttribute('data-baseline-score')), summary.baseline) || !closeEnough(baselineScore, summary.baseline)) failures.push(prefix + 'baseline score mismatch');
      if (!closeEnough(number(row.getAttribute('data-treatment-score')), summary.treatment) || !closeEnough(treatmentScore, summary.treatment)) failures.push(prefix + 'treatment score mismatch');
      if (!closeEnough(delta, summary.delta)) failures.push(prefix + 'delta mismatch');
      if (baselineLabel !== summary.baselineLabel || treatmentLabel !== summary.treatmentLabel) failures.push(prefix + 'condition labels mismatch');
      if (row.getAttribute('href') !== summary.detailHref || row.getAttribute('data-report-href') !== summary.detailHref) failures.push(prefix + 'detail href mismatch');
      if (text(row.querySelector('.benchmark-ledger__identity > strong')) !== benchmark.name) failures.push(prefix + 'name mismatch');
      if (text(row.querySelector('.benchmark-ledger__identity > small')) !== benchmark.description) failures.push(prefix + 'description mismatch');
      if (text(evidence?.querySelector(':scope > strong')) !== summary.complete + '/' + summary.total + ' ' + summary.completionLabel) failures.push(prefix + 'completion mismatch');
      if (evidenceSpans[0] !== summary.wins + 'W · ' + summary.ties + 'T · ' + summary.losses + 'L') failures.push(prefix + 'W/T/L mismatch');
      if (evidenceSpans[1] !== summary.calibration) failures.push(prefix + 'calibration mismatch');
      if (action !== expectedAction) failures.push(prefix + 'action mismatch ' + action);
      if (row.querySelector('a[href]')) failures.push(prefix + 'nested unrelated evidence link');

      if (summary.evidenceKind === 'development') {
        if (!row.classList.contains('benchmark-ledger__row--measured') || row.classList.contains('benchmark-ledger__row--illustrative')) failures.push(prefix + 'measured class mismatch');
        if (benchmark.sourceHref != null || summary.sourceHref !== null) failures.push(prefix + 'development source metadata should be absent');
        if (summary.treatmentLabel !== 'Architecture skill') failures.push(prefix + 'development treatment mislabeled');
      } else {
        if (!row.classList.contains('benchmark-ledger__row--illustrative') || row.classList.contains('benchmark-ledger__row--measured')) failures.push(prefix + 'illustrative class mismatch');
        if (summary.sourceHref !== null || benchmark.sourceHref) failures.push(prefix + 'illustrative row has unrelated source evidence');
        if (summary.detailHref !== './benchmark-report.html#' + benchmark.id || !/^\.\/benchmark-report\.html#[a-z0-9-]+$/.test(summary.detailHref)) failures.push(prefix + 'illustrative preview route mismatch');
        if (summary.calibration !== 'Illustrative fixture') failures.push(prefix + 'illustrative calibration label mismatch');
      }
    });

    await selectMode('models');
    const restoredMode = modeState();
    const restoredRows = document.querySelectorAll('#panel-capabilities .capability-rank-row[data-setting-id]').length;
    if (
      location.hash !== '#capabilities/' + category.id ||
      restoredMode.count !== 3 ||
      restoredMode.selectedMode !== 'models' ||
      restoredMode.selectedCount !== 1 ||
      restoredMode.rovingZeroCount !== 1 ||
      restoredMode.tabIndexes.models !== 0 ||
      restoredMode.tabIndexes.benchmarks !== -1 ||
      restoredMode.tabIndexes.efficiency !== -1 ||
      restoredMode.controlledId !== 'capability-ranking' ||
      !restoredMode.controlledPanelExists ||
      restoredRows !== 20
    ) {
      failures.push('model mode did not restore canonical route/ranking ' + JSON.stringify({ restoredMode, restoredRows }));
    }

    return {
      category: category.id,
      trackCount: tracks.length,
      testCount: rows.length,
      measuredCount: expectedSummaries.filter((summary) => summary?.evidenceKind === 'development').length,
      illustrativeCount: expectedSummaries.filter((summary) => summary?.evidenceKind === 'illustrative').length,
      modelRoute: location.hash,
      failures
    };
  };

  await selectCategory('engineering');
  await selectMode('models');
  const modelsTab = document.querySelector('.capability-mode__tab[data-capability-mode="models"]');
  modelsTab?.focus();
  modelsTab?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  const afterArrowRight = modeState();
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  await settle();
  const afterHome = modeState();
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  await settle();
  const afterEnd = modeState();
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  await settle();
  const afterArrowLeft = modeState();
  const modeKeyboard = { afterArrowRight, afterHome, afterEnd, afterArrowLeft };

  const categoryAudits = [];
  for (const category of data.categories) categoryAudits.push(await auditCategory(category));
  const measuredEngineering = data.benchmarks
    .filter((benchmark) => benchmark.category === 'engineering' && benchmark.evidenceKind === 'development')
    .map((benchmark) => benchmark.id);
  const developmentSummaries = data.benchmarkSummaries.filter((summary) => summary.evidenceKind === 'development');
  const illustrativeSummaries = data.benchmarkSummaries.filter((summary) => summary.evidenceKind === 'illustrative');

  await selectCategory(returnCategory);
  await selectMode(returnMode);

  return {
    modeKeyboard,
    categoryAudits,
    measuredEngineering,
    expectedMeasuredEngineering,
    developmentSummaryCount: developmentSummaries.length,
    developmentSourcesAbsent: developmentSummaries.filter((summary) => summary.sourceHref === null).length,
    illustrativeSummaryCount: illustrativeSummaries.length,
    illustrativeSourcesAbsent: illustrativeSummaries.filter((summary) => summary.sourceHref === null).length,
    totalTracks: categoryAudits.reduce((sum, audit) => sum + audit.trackCount, 0),
    totalTests: categoryAudits.reduce((sum, audit) => sum + audit.testCount, 0),
    returnedMode: document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') || '',
    returnedHash: location.hash,
    expectedReturnedHash: '#capabilities/' + returnCategory + (returnMode === 'models' ? '' : '/' + returnMode)
  };
})()`
  .replace('@@CATEGORY@@', JSON.stringify(returnCategory))
  .replace('@@MODE@@', JSON.stringify(returnMode));

const efficiencyContextAuditExpression = (returnCategory, returnMode) => String.raw`(async () => {
  const returnCategory = @@CATEGORY@@;
  const returnMode = @@MODE@@;
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const data = window.VASIR_DATA;
  const fields = [{ id: 'overall', name: 'Combined' }, ...data.categories];
  const workspace = () => document.querySelector('#panel-capabilities');
  const selectedEntry = () => workspace()?.getAttribute('data-selected-entry') || '';
  const scoreFor = (entry, field) => field === 'overall'
    ? entry.score
    : entry.categories.find((reading) => reading.category === field)?.score;
  const ranking = (field) => [...data.entries].sort((left, right) => (
    scoreFor(right, field) - scoreFor(left, field) ||
    right.score - left.score ||
    left.cost - right.cost ||
    left.id.localeCompare(right.id)
  ));
  const frontier = (field, metric) => data.entries
    .filter((entry) => !data.entries.some((other) => (
      scoreFor(other, field) >= scoreFor(entry, field) &&
      other[metric] <= entry[metric] &&
      (scoreFor(other, field) > scoreFor(entry, field) || other[metric] < entry[metric])
    )))
    .sort((left, right) => left[metric] - right[metric]);
  const sample = (entries, maximum = 8, selectedId = null) => {
    if (entries.length <= maximum) return entries;
    const sampled = Array.from({ length: maximum }, (_, index) => entries[Math.round((index / (maximum - 1)) * (entries.length - 1))]);
    const selectedIndex = selectedId ? entries.findIndex((entry) => entry.id === selectedId) : -1;
    if (selectedIndex >= 0 && !sampled.some((entry) => entry.id === selectedId)) {
      const replacementIndex = Math.max(1, Math.min(maximum - 2, Math.round((selectedIndex / (entries.length - 1)) * (maximum - 1))));
      sampled[replacementIndex] = entries[selectedIndex];
      sampled.sort((left, right) => entries.indexOf(left) - entries.indexOf(right));
    }
    return sampled;
  };
  const selectCategory = async (category) => {
    document.querySelector('.capability-selector__tab[data-category-id="' + CSS.escape(category) + '"]')?.click();
    await settle();
  };
  const selectMode = async (mode) => {
    document.querySelector('.capability-mode__tab[data-capability-mode="' + CSS.escape(mode) + '"]')?.click();
    await settle();
  };

  const initialSelection = selectedEntry();
  const fieldAudits = [];
  for (const field of fields) {
    await selectCategory(field.id);
    await selectMode('efficiency');
    const failures = [];
    const expectedRanking = ranking(field.id);
    const rankById = new Map(expectedRanking.map((entry, index) => [entry.id, index + 1]));
    const metric = document.querySelector('#resource-axis')?.value || '';
    const selectedId = selectedEntry();
    const completeFrontier = frontier(field.id, metric);
    const completeFrontierIds = completeFrontier.map((entry) => entry.id);
    const expectedFrontier = sample(completeFrontier, 8, selectedId).map((entry) => entry.id);
    const points = [...document.querySelectorAll('#capability-efficiency:not([hidden]) .plot-point[data-entry-id]')];
    const pointIds = points.map((point) => point.getAttribute('data-entry-id') || '');
    const actualFrontier = [...document.querySelectorAll('#capability-efficiency:not([hidden]) .frontier-row[data-entry-id]')]
      .map((row) => row.getAttribute('data-entry-id') || '');
    const selects = [...document.querySelectorAll('#capability-efficiency:not([hidden]) select:not([disabled])')];
    const expectedSelected = data.entries.find((entry) => entry.id === selectedId);
    const visibleScore = Number.parseFloat(document.querySelector('#capability-efficiency:not([hidden]) .efficiency-summary__score strong')?.textContent || '');
    const visibleRank = Number.parseInt(document.querySelector('#capability-efficiency:not([hidden]) .efficiency-summary__score small')?.textContent.replace(/\D/g, '') || '', 10);
    const title = document.querySelector('#capability-efficiency:not([hidden]) #efficiency-field-title')?.textContent.replace(/\s+/g, ' ').trim() || '';
    const yAxis = document.querySelector('#capability-efficiency:not([hidden]) .efficiency-plane__axis-label--y')?.textContent.replace(/\s+/g, ' ').trim() || '';
    const frontierPath = document.querySelector('#capability-efficiency:not([hidden]) .efficiency-plane__frontier');
    const frontierPathIds = (frontierPath?.getAttribute('data-frontier-ids') || '').split(',').filter(Boolean);
    const frontierPathPointCount = (frontierPath?.getAttribute('points') || '').trim().split(/\s+/).filter(Boolean).length;
    const frontierMarkIds = points.filter((point) => point.classList.contains('is-frontier')).map((point) => point.getAttribute('data-entry-id'));
    const trajectoryIds = (document.querySelector('#capability-efficiency:not([hidden]) .efficiency-plane__trajectory')?.getAttribute('data-entry-ids') || '').split(',').filter(Boolean);
    const expectedTrajectoryIds = expectedSelected
      ? data.conditions.map((condition) => expectedSelected.settingId + '-' + condition.id)
      : [];
    const rovingPoints = points.filter((point) => point.tabIndex === 0);
    const selectedPoint = points.find((point) => point.getAttribute('data-entry-id') === selectedId);
    const annotation = document.querySelector('#capability-efficiency:not([hidden]) .efficiency-plane__annotation');
    const annotationText = annotation?.textContent.replace(/\s+/g, ' ').trim() || '';
    const canvas = document.querySelector('#capability-efficiency:not([hidden]) .efficiency-plane__canvas');
    const annotationBox = annotation?.getBoundingClientRect();
    const canvasBox = canvas?.getBoundingClientRect();
    const annotationVisible = Boolean(annotationBox && annotationBox.width > 0 && annotationBox.height > 0 && getComputedStyle(annotation).display !== 'none');
    const annotationInside = !annotationVisible && innerWidth <= 688 ? true : Boolean(annotationBox && canvasBox &&
      annotationBox.left >= canvasBox.left - 1 && annotationBox.top >= canvasBox.top - 1 &&
      annotationBox.right <= canvasBox.right + 1 && annotationBox.bottom <= canvasBox.bottom + 1);
    const annotationCoveredFrontier = annotationVisible && annotationBox
      ? points.filter((point) => point.classList.contains('is-frontier')).filter((point) => {
        const box = point.getBoundingClientRect();
        const x = box.left + (box.width / 2);
        const y = box.top + (box.height / 2);
        return x >= annotationBox.left && x <= annotationBox.right && y >= annotationBox.top && y <= annotationBox.bottom;
      }).map((point) => point.getAttribute('data-entry-id'))
      : [];
    const legendConditions = document.querySelectorAll('#capability-efficiency:not([hidden]) .efficiency-legend .condition-label').length;
    const legendFrontier = Boolean(document.querySelector('#capability-efficiency:not([hidden]) .efficiency-legend__frontier'));
    const pointConditionCounts = Object.fromEntries(data.conditions.map((condition) => [
      condition.id,
      points.filter((point) => point.classList.contains('plot-point--' + condition.id)).length
    ]));

    if (location.hash !== '#capabilities/' + field.id + '/efficiency') failures.push('route ' + location.hash);
    if (document.querySelector('.capability-selector__tab[aria-selected="true"]')?.getAttribute('data-category-id') !== field.id) failures.push('selected field mismatch');
    if (document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') !== 'efficiency') failures.push('selected mode mismatch');
    if (selects.length !== 2 || selects.map((select) => select.id).sort().join('|') !== 'efficiency-entry|resource-axis') failures.push('select contract ' + selects.map((select) => select.id).join(','));
    if (document.querySelector('#efficiency-score-field')) failures.push('duplicate quality field selector remains');
    if (points.length !== 60 || new Set(pointIds).size !== 60) failures.push('plot points ' + points.length + '/60, unique ' + new Set(pointIds).size);
    data.conditions.forEach((condition) => {
      if (pointConditionCounts[condition.id] !== 20) failures.push(condition.id + ' marks ' + pointConditionCounts[condition.id] + '/20');
    });
    if (pointIds.some((id) => !data.entries.some((entry) => entry.id === id))) failures.push('unknown plot point entry');
    points.forEach((point) => {
      const entry = data.entries.find((candidate) => candidate.id === point.getAttribute('data-entry-id'));
      if (!entry) return;
      const label = point.getAttribute('aria-label') || '';
      if (!label.includes(field.name) || !label.includes('rank ' + rankById.get(entry.id)) || !label.includes('score ' + scoreFor(entry, field.id).toFixed(1))) {
        failures.push('point label ' + entry.id + ': ' + label);
      }
    });
    if (!expectedSelected || Math.abs(visibleScore - scoreFor(expectedSelected, field.id)) > 0.05 || visibleRank !== rankById.get(selectedId)) failures.push('selected score/rank mismatch');
    if (!title.includes(field.name + ' score') || !yAxis.includes(field.name + ' score / 100') || !yAxis.includes('55–95')) failures.push('context copy ' + title + ' / ' + yAxis);
    if (actualFrontier.join('|') !== expectedFrontier.join('|')) failures.push('frontier ' + actualFrontier.join(',') + ' != ' + expectedFrontier.join(','));
    if (!frontierPath || frontierPathIds.join('|') !== completeFrontierIds.join('|') || frontierPathPointCount !== completeFrontierIds.length) failures.push('frontier path ' + frontierPathIds.join(',') + ' / ' + frontierPathPointCount + ' points');
    if (frontierMarkIds.slice().sort().join('|') !== completeFrontierIds.slice().sort().join('|')) failures.push('frontier marks ' + frontierMarkIds.join(','));
    if (trajectoryIds.join('|') !== expectedTrajectoryIds.join('|')) failures.push('trajectory ' + trajectoryIds.join(',') + ' != ' + expectedTrajectoryIds.join(','));
    if (rovingPoints.length !== 1 || rovingPoints[0]?.getAttribute('data-entry-id') !== selectedId) failures.push('roving plot focus ' + rovingPoints.map((point) => point.getAttribute('data-entry-id')).join(','));
    if (!selectedPoint || getComputedStyle(selectedPoint, '::before').width.replace('px', '') < 13) failures.push('selected mark lacks visual weight');
    if (!annotation || annotation.getAttribute('data-entry-id') !== selectedId || !annotationText.includes(expectedSelected?.family || '') || !annotationText.includes(scoreFor(expectedSelected, field.id).toFixed(1)) || !annotationInside || (innerWidth > 688 && !annotationVisible)) failures.push('selected annotation ' + annotationText + ', visible=' + annotationVisible + ', inside=' + annotationInside);
    if (annotationCoveredFrontier.length) failures.push('selected annotation covers frontier marks ' + annotationCoveredFrontier.join(','));
    if (legendConditions !== 3 || !legendFrontier) failures.push('legend ' + legendConditions + '/3 conditions, frontier=' + legendFrontier);
    if (selectedId !== initialSelection) failures.push('selection changed ' + initialSelection + '→' + selectedId);

    fieldAudits.push({
      field: field.id,
      pointCount: points.length,
      selectCount: selects.length,
      frontierCount: actualFrontier.length,
      completeFrontierCount: completeFrontierIds.length,
      rovingCount: rovingPoints.length,
      failures
    });
  }

  await selectCategory(returnCategory);
  await selectMode(returnMode);
  return {
    initialSelection,
    fieldAudits,
    returnedMode: document.querySelector('.capability-mode__tab[aria-selected="true"]')?.getAttribute('data-capability-mode') || '',
    returnedHash: location.hash,
    expectedReturnedHash: '#capabilities/' + returnCategory + (returnMode === 'models' ? '' : '/' + returnMode)
  };
})()`
  .replace('@@CATEGORY@@', JSON.stringify(returnCategory))
  .replace('@@MODE@@', JSON.stringify(returnMode));

const plotPointerSmokeExpression = String.raw`(async () => {
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const ids = [...document.querySelectorAll('.plot-point[data-entry-id]')]
    .map((point) => point.getAttribute('data-entry-id'));
  const failures = [];
  let exercised = 0;

  for (const id of ids) {
    let point = document.querySelector('.plot-point[data-entry-id="' + CSS.escape(id) + '"]');
    if (!point) {
      failures.push(id + ': point disappeared');
      continue;
    }

    point.closest('.efficiency-plane__canvas')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    await settle();
    point = document.querySelector('.plot-point[data-entry-id="' + CSS.escape(id) + '"]');
    if (!point) {
      failures.push(id + ': point disappeared after plot recenter');
      continue;
    }

    const box = point.getBoundingClientRect();
    const clientX = box.left + box.width / 2;
    const clientY = box.top + box.height / 2;
    const target = document.elementFromPoint(clientX, clientY);
    if (!target) {
      failures.push(id + ': no pointer target');
      continue;
    }

    target.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      view: window
    }));
    await settle();
    exercised += 1;

    const selected = document.querySelector('.plot-point[data-entry-id="' + CSS.escape(id) + '"][aria-pressed="true"]');
    if (!selected) {
      const current = document.querySelector('.plot-point[aria-pressed="true"]')?.getAttribute('data-entry-id') || 'none';
      failures.push(id + ': selected ' + current + ' via ' + (target.className || target.tagName));
    }
  }

  return { total: ids.length, exercised, failures: failures.slice(0, 12) };
})()`;

const plotInspectionSmokeExpression = String.raw`(async () => {
  const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const workspace = document.querySelector('#panel-capabilities');
  const canvas = document.querySelector('.efficiency-plane__canvas');
  const layer = canvas?.querySelector('.efficiency-plane__pointer-layer');
  const points = [...(canvas?.querySelectorAll('.plot-point[data-entry-id]') || [])];
  const selectedId = canvas?.getAttribute('data-selected-id') || '';
  const selectedPoint = points.find((point) => point.getAttribute('data-entry-id') === selectedId);
  const inspectedPoint = points.find((point) => point.getAttribute('data-entry-id') !== selectedId);
  const tooltip = canvas?.querySelector('.efficiency-plane__tooltip');
  const annotation = canvas?.querySelector('.efficiency-plane__annotation');
  const failures = [];

  if (!canvas || !layer || !selectedPoint || !inspectedPoint || !tooltip || !annotation) {
    return { failures: ['missing plot inspection fixture'], selectedId, rovingCount: 0 };
  }
  if (workspace?.getAttribute('data-selected-entry') !== selectedId) {
    failures.push('canvas/workspace selection mismatch');
  }

  const inspectedBox = inspectedPoint.getBoundingClientRect();
  const clientX = inspectedBox.left + (inspectedBox.width / 2);
  const clientY = inspectedBox.top + (inspectedBox.height / 2);
  layer.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX, clientY, pointerType: 'mouse' }));
  await settle();
  const hoverState = {
    hidden: tooltip.hidden,
    id: tooltip.getAttribute('data-entry-id') || '',
    persistentId: annotation.getAttribute('data-entry-id') || '',
    selectedId: workspace.getAttribute('data-selected-entry') || ''
  };
  if (hoverState.hidden || hoverState.id !== inspectedPoint.getAttribute('data-entry-id') || hoverState.persistentId !== selectedId || hoverState.selectedId !== selectedId) {
    failures.push('hover inspection ' + JSON.stringify(hoverState));
  }

  layer.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false, pointerType: 'mouse' }));
  await settle();
  if (!tooltip.hidden) failures.push('pointerleave did not hide tooltip');

  const focusPoint = canvas.querySelector('.plot-point[data-entry-id="' + CSS.escape(hoverState.id) + '"]');
  points.forEach((point) => { point.tabIndex = point === focusPoint ? 0 : -1; });
  const neutralFocus = document.createElement('button');
  neutralFocus.type = 'button';
  neutralFocus.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;';
  document.body.append(neutralFocus);
  neutralFocus.focus({ preventScroll: true });
  const neutralActive = document.activeElement === neutralFocus;
  await settle();
  focusPoint?.focus({ preventScroll: true });
  focusPoint?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: neutralFocus }));
  neutralFocus.remove();
  await settle();
  const focusState = {
    hidden: tooltip.hidden,
    id: tooltip.getAttribute('data-entry-id') || '',
    activeId: document.activeElement?.getAttribute('data-entry-id') || ''
  };
  if (focusState.hidden || focusState.id !== hoverState.id || focusState.activeId !== hoverState.id) {
    failures.push('focus inspection ' + JSON.stringify({ ...focusState, selectedId, hoverId: hoverState.id, neutralActive }));
  }
  focusPoint?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
  focusPoint?.blur();
  await settle();
  if (!tooltip.hidden) failures.push('blur did not hide tooltip');

  selectedPoint.focus({ preventScroll: true });
  selectedPoint.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
  await settle();
  const directionalId = document.activeElement?.getAttribute('data-entry-id') || '';
  const roving = points.filter((point) => point.tabIndex === 0);
  if (!directionalId || directionalId === selectedId) failures.push('ArrowLeft did not move plot focus');
  if (roving.length !== 1 || roving[0] !== document.activeElement) failures.push('roving focus count/target ' + roving.map((point) => point.getAttribute('data-entry-id')).join(','));
  if (workspace.getAttribute('data-selected-entry') !== selectedId) failures.push('directional focus changed selection');

  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await settle();
  if (!tooltip.hidden) failures.push('Escape did not hide tooltip');

  return {
    selectedId,
    directionalId,
    rovingCount: roving.length,
    hoverState,
    focusState,
    failures
  };
})()`;

const capabilitySelectorInkExpression = (categoryId) => String.raw`(() => {
  const categoryId = @@CATEGORY_ID@@;
  const tab = document.querySelector('.capability-selector__tab[data-category-id="' + CSS.escape(categoryId) + '"]');
  if (!tab) return { found: false, categoryId };
  const pseudo = getComputedStyle(tab, '::before');
  const transform = pseudo.transform === 'none' ? new DOMMatrix() : new DOMMatrix(pseudo.transform);
  const box = tab.getBoundingClientRect();
  const normalizeColor = (value) => {
    const probe = document.createElement('span');
    probe.style.color = value;
    document.body.append(probe);
    const normalized = getComputedStyle(probe).color;
    probe.remove();
    return normalized;
  };
  const paperColor = normalizeColor(getComputedStyle(tab).getPropertyValue('--sdk-paper').trim());
  const colorOf = (selector) => getComputedStyle(tab.querySelector(selector)).color;
  return {
    found: true,
    categoryId,
    selected: tab.getAttribute('aria-selected') === 'true',
    hoverCapable: matchMedia('(hover: hover) and (pointer: fine)').matches,
    tab: { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height },
    ink: {
      opacity: Number(pseudo.opacity),
      width: Number.parseFloat(pseudo.width) * Math.abs(transform.a),
      backgroundColor: pseudo.backgroundColor
    },
    paperColor,
    colors: {
      index: colorOf('.capability-selector__index'),
      name: colorOf('.capability-selector__name'),
      state: colorOf('.capability-selector__state'),
      score: colorOf(':scope > strong'),
      unit: colorOf(':scope > strong small')
    }
  };
})()`
  .replace('@@CATEGORY_ID@@', JSON.stringify(categoryId));

const combinedScoreGuideTargetExpression = (score, rowIndex = 2) => String.raw`(() => {
  const requestedScore = @@SCORE@@;
  const requestedRowIndex = @@ROW_INDEX@@;
  const scoreField = document.querySelector('.score-field--combined');
  const resultList = scoreField?.querySelector('.result-list');
  const tracks = [...scoreField?.querySelectorAll('.capability-composition--full .capability-composition__track') || []];
  const track = tracks[Math.min(requestedRowIndex, Math.max(0, tracks.length - 1))];
  const guide = scoreField?.querySelector('.capability-score-guide');
  if (!scoreField || !resultList || !track || !guide || !window.d3?.scaleLinear) {
    return { found: false, requestedScore, requestedRowIndex };
  }

  const fieldBox = scoreField.getBoundingClientRect();
  const listBox = resultList.getBoundingClientRect();
  const trackBox = track.getBoundingClientRect();
  const trackStyle = getComputedStyle(track);
  const borderLeft = Number.parseFloat(trackStyle.borderLeftWidth) || 0;
  const borderRight = Number.parseFloat(trackStyle.borderRightWidth) || 0;
  const contentLeft = trackBox.left + borderLeft;
  const contentRight = trackBox.right - borderRight;
  const scale = window.d3.scaleLinear().domain([0, 100]).range([contentLeft, contentRight]).clamp(true);
  const boundedScore = scale.invert(scale(requestedScore));
  const rowBoxes = [...resultList.querySelectorAll('.setting-row')].map((row) => {
    const box = row.getBoundingClientRect();
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
  });

  return {
    found: true,
    requestedScore,
    boundedScore,
    point: { x: scale(boundedScore), y: trackBox.top + (trackBox.height / 2) },
    field: { left: fieldBox.left, top: fieldBox.top, right: fieldBox.right, bottom: fieldBox.bottom, width: fieldBox.width, height: fieldBox.height },
    list: { left: listBox.left, top: listBox.top, right: listBox.right, bottom: listBox.bottom, width: listBox.width, height: listBox.height },
    track: { left: contentLeft, right: contentRight, width: contentRight - contentLeft },
    rowCount: rowBoxes.length,
    rowBoxes,
    guideInitiallyVisible: guide.classList.contains('is-visible')
  };
})()`
  .replace('@@SCORE@@', JSON.stringify(score))
  .replace('@@ROW_INDEX@@', JSON.stringify(rowIndex));

const combinedScoreGuideStateExpression = String.raw`(() => {
  const scoreField = document.querySelector('.score-field--combined');
  const resultList = scoreField?.querySelector('.result-list');
  const guide = scoreField?.querySelector('.capability-score-guide');
  const line = guide?.querySelector('.capability-score-guide__line');
  const readout = guide?.querySelector('.capability-score-guide__readout');
  const track = scoreField?.querySelector('.capability-composition--full .capability-composition__track');
  if (!scoreField || !resultList || !guide || !line || !readout || !track) return { found: false };

  const fieldBox = scoreField.getBoundingClientRect();
  const listBox = resultList.getBoundingClientRect();
  const guideBox = guide.getBoundingClientRect();
  const lineBox = line.getBoundingClientRect();
  const readoutBox = readout.getBoundingClientRect();
  const trackBox = track.getBoundingClientRect();
  const trackStyle = getComputedStyle(track);
  const guideStyle = getComputedStyle(guide);
  const borderLeft = Number.parseFloat(trackStyle.borderLeftWidth) || 0;
  const borderRight = Number.parseFloat(trackStyle.borderRightWidth) || 0;
  const contentLeft = trackBox.left + borderLeft;
  const contentRight = trackBox.right - borderRight;
  const rowBoxes = [...resultList.querySelectorAll('.setting-row')].map((row) => {
    const box = row.getBoundingClientRect();
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
  });
  const parsedScore = Number(guide.dataset.score);

  return {
    found: true,
    visible: guide.classList.contains('is-visible') && guideStyle.display !== 'none' && Number(guideStyle.opacity) > 0.99,
    hasVisibleClass: guide.classList.contains('is-visible'),
    score: Number.isFinite(parsedScore) ? parsedScore : null,
    source: guide.dataset.source || '',
    readout: readout.textContent.replace(/\s+/g, ''),
    labelShift: guide.style.getPropertyValue('--score-guide-label-shift').trim(),
    guide: { left: guideBox.left, top: guideBox.top, right: guideBox.right, bottom: guideBox.bottom, width: guideBox.width, height: guideBox.height },
    line: { left: lineBox.left, top: lineBox.top, right: lineBox.right, bottom: lineBox.bottom, width: lineBox.width, height: lineBox.height, centerX: lineBox.left + (lineBox.width / 2) },
    readoutBox: { left: readoutBox.left, top: readoutBox.top, right: readoutBox.right, bottom: readoutBox.bottom, width: readoutBox.width, height: readoutBox.height },
    field: { left: fieldBox.left, top: fieldBox.top, right: fieldBox.right, bottom: fieldBox.bottom, width: fieldBox.width, height: fieldBox.height },
    list: { left: listBox.left, top: listBox.top, right: listBox.right, bottom: listBox.bottom, width: listBox.width, height: listBox.height },
    track: { left: contentLeft, right: contentRight, width: contentRight - contentLeft },
    rowCount: rowBoxes.length,
    rowBoxes,
    activeSegment: document.activeElement?.classList.contains('capability-composition__segment') || false
  };
})()`;

const combinedScoreGuideFocusExpression = String.raw`(() => {
  const scoreField = document.querySelector('.score-field--combined');
  const stack = scoreField?.querySelector('.capability-composition--full .capability-composition__stack');
  const segments = [...(stack?.querySelectorAll('.capability-composition__segment') || [])];
  const segment = segments[2];
  if (!scoreField || segments.length !== 5 || !segment) return { found: false, segmentCount: segments.length };
  const expectedScore = segments.slice(0, 3).reduce((sum, candidate) => sum + (Number(candidate.dataset.contribution) || 0), 0);
  segment.focus({ preventScroll: true });
  return {
    found: true,
    expectedScore,
    segmentCount: segments.length,
    focused: document.activeElement === segment,
    categoryId: segment.dataset.categoryId || ''
  };
})()`;

const plotPointSetupExpression = (index) => String.raw`(() => {
  const classText = (element) => {
    if (typeof element.className === 'string') return element.className;
    return element.className && typeof element.className.baseVal === 'string' ? element.className.baseVal : '';
  };
  const isVisible = (element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
  };
  const isPlotPoint = (element) => {
    const identity = classText(element);
    const context = element.closest('[class*="plot"], [class*="plane"], [aria-label*="plot" i], [aria-label*="chart" i]');
    return element.hasAttribute('data-plot-point') ||
      (/point|dot|plot-mark/i.test(identity) && Boolean(context)) ||
      ((element.hasAttribute('data-entry-id') || element.hasAttribute('data-entry')) && Boolean(context));
  };
  const points = [...new Set([
    ...document.querySelectorAll('button'),
    ...document.querySelectorAll('[role="button"]')
  ])].filter((element) => isVisible(element) && isPlotPoint(element));
  const point = points[${index}] || points[0];
  window.__captureQaKeyboard = { clicks: 0, handled: false, label: '', focused: false };
  if (!point) return { count: 0, focused: false, label: '' };
  window.__captureQaKeyboard.label = point.getAttribute('aria-label') || point.textContent.trim() || classText(point);
  point.addEventListener('click', () => { window.__captureQaKeyboard.clicks += 1; }, { once: true });
  point.addEventListener('keydown', (event) => {
    queueMicrotask(() => { window.__captureQaKeyboard.handled = window.__captureQaKeyboard.handled || event.defaultPrevented; });
  }, { once: true });
  point.focus({ preventScroll: true });
  window.__captureQaKeyboard.focused = document.activeElement === point;
  return { count: points.length, focused: window.__captureQaKeyboard.focused, label: window.__captureQaKeyboard.label };
})()`;

function auditProblems(stage, audit) {
  const problems = [];
  if (audit.innerWidth !== width || audit.innerHeight !== height) {
    problems.push(`${stage} viewport ${audit.innerWidth}×${audit.innerHeight}, expected ${width}×${height}`);
  }
  if (audit.scrollWidth > audit.innerWidth) {
    const diagnostics = audit.overflowingElements.length ? ` (${audit.overflowingElements.join(' | ')})` : '';
    problems.push(`${stage} horizontal overflow ${audit.scrollWidth - audit.innerWidth}px${diagnostics}`);
  }
  if (audit.duplicates.length) problems.push(`${stage} duplicate ids: ${audit.duplicates.join(', ')}`);
  if (audit.semanticIssues.length) problems.push(`${stage} semantic labels: ${audit.semanticIssues.join(' | ')}`);
  if (audit.brokenHashes.length) problems.push(`${stage} broken hashes: ${audit.brokenHashes.join(', ')}`);
  if (audit.tinyControls.length) problems.push(`${stage} undersized controls: ${audit.tinyControls.join(' | ')}`);
  if (audit.unfocusablePlotPoints.length) problems.push(`${stage} unfocusable plot points: ${audit.unfocusablePlotPoints.join(' | ')}`);
  return problems;
}

function capabilityStateProblems(stage, state) {
  const problems = [];
  const expectedControls = {
    models: 'capability-ranking',
    benchmarks: 'capability-benchmarks',
    efficiency: 'capability-efficiency'
  };
  const expectedHash = `#capabilities/${state.expectedCategory}${state.expectedMode === 'models' ? '' : `/${state.expectedMode}`}`;
  if (state.hash !== expectedHash) {
    problems.push(`${stage} hash ${state.hash || '(empty)'}, expected ${expectedHash}`);
  }
  if (state.globalLensNavigationCount !== 0 || state.globalTabPanelCount !== 0) {
    problems.push(`${stage} obsolete global-lens chrome remains (${state.globalLensNavigationCount} controls, ${state.globalTabPanelCount} top-level tabpanels)`);
  }
  if (!state.workspaceVisible) problems.push(`${stage} capability workspace is not visible`);
  if (state.d3Version !== '7.9.0') problems.push(`${stage} D3 runtime ${state.d3Version || '(missing)'}, expected 7.9.0`);
  if (
    state.pageFrameWidth <= 0 ||
    Math.abs(state.pageFrameLeft) > 0.5 ||
    Math.abs(state.pageFrameRight - state.viewportWidth) > 0.5
  ) {
    problems.push(
      `${stage} page frame is not full bleed: ` +
      `${state.pageFrameLeft.toFixed(1)}–${state.pageFrameRight.toFixed(1)} of ${state.viewportWidth}px`
    );
  }
  if (!state.selectedEntry) problems.push(`${stage} workspace has no data-selected-entry`);
  if (state.hasEffectTab || state.hasEffectPanel) {
    problems.push(`${stage} obsolete Vasir effect tab/panel remains`);
  }
  if (state.unexpectedKanitCount !== 0) {
    problems.push(`${stage} Kanit leaked beyond approved headline values: ${state.unexpectedKanit.join(', ')}`);
  }

  state.modeTabRecords.forEach((tab) => {
    const selected = tab.mode === state.expectedMode;
    if (!['models', 'benchmarks', 'efficiency'].includes(tab.mode)) problems.push(`${stage} unknown view mode ${tab.mode || '(missing)'}`);
    if (tab.controls !== expectedControls[tab.mode] || tab.controlsPanel !== tab.controls) {
      problems.push(`${stage} ${tab.mode || 'unnamed'} view aria-controls mismatch`);
    }
    if (tab.panelLabelledBy !== tab.id) problems.push(`${stage} ${tab.mode || 'unnamed'} view panel label mismatch`);
    if (tab.selected !== String(selected)) problems.push(`${stage} ${tab.mode || 'unnamed'} aria-selected=${tab.selected}`);
    if (tab.tabIndex !== (selected ? 0 : -1)) problems.push(`${stage} ${tab.mode || 'unnamed'} tabindex=${tab.tabIndex}`);
  });

  if (
    state.capabilityModeTabsWidth <= 0 ||
    Math.abs(state.capabilityModeTabsWidth - state.capabilityModeTabsCoveredWidth) > 2 ||
    state.capabilityModeTabWidthSpread > 2 ||
    state.capabilityModeTabMinHeight < 43.99
  ) {
    problems.push(
      `${stage} local view tabs do not fill evenly: rail ${state.capabilityModeTabsWidth.toFixed(1)}px, ` +
      `tabs ${state.capabilityModeTabsCoveredWidth.toFixed(1)}px, width spread ${state.capabilityModeTabWidthSpread.toFixed(1)}px, ` +
      `minimum height ${state.capabilityModeTabMinHeight.toFixed(1)}px`
    );
  }

  {
    const expectedBenchmarkCounts = { overall: 24, engineering: 5, games: 5, product: 5, writing: 4, workflows: 5 };
    const expectedTrackCounts = { overall: 10, engineering: 2, games: 2, product: 2, writing: 2, workflows: 2 };
    if (state.capabilitySelectorCount !== 6 || state.selectedCapabilitySelectorCount !== 1) {
      problems.push(`${stage} capability selectors ${state.capabilitySelectorCount}/6 with ${state.selectedCapabilitySelectorCount}/1 selected`);
    }
    if (state.selectedCapabilityCategory !== state.expectedCategory) {
      problems.push(`${stage} selected capability ${state.selectedCapabilityCategory || '(none)'}, expected ${state.expectedCategory}`);
    }
    if (
      state.capabilityModeTabCount !== 3 ||
      state.selectedCapabilityModeCount !== 1 ||
      state.capabilityModeRovingZeroCount !== 1 ||
      state.selectedCapabilityMode !== state.expectedMode ||
      state.capabilityModePanelCount !== 3 ||
      state.capabilityModeVisiblePanelCount !== 1 ||
      !state.capabilityModeAllControlsResolve ||
      state.selectedCapabilityModeControls !== expectedControls[state.selectedCapabilityMode] ||
      !state.activeModePanelVisible
    ) {
      problems.push(
        `${stage} capability modes ${state.capabilityModeTabCount}/3 with ` +
        `${state.selectedCapabilityModeCount}/1 selected and ${state.capabilityModeRovingZeroCount}/1 roving: ` +
        `${state.selectedCapabilityMode || '(none)'}; panels ${state.capabilityModePanelCount}/3, ` +
        `${state.capabilityModeVisiblePanelCount}/1 visible, controls resolve=${state.capabilityModeAllControlsResolve}`
      );
    }
    const expectedCapabilityOrientation = width > 1080 ? 'vertical' : 'horizontal';
    if (state.capabilitySelectorOrientation !== expectedCapabilityOrientation) {
      problems.push(`${stage} capability field orientation ${state.capabilitySelectorOrientation || '(missing)'}, expected ${expectedCapabilityOrientation}`);
    }
    if (width > 1080) {
      if (
        state.capabilitySelectorTopSpread < 200 ||
        state.capabilitySelectorsInViewport !== 6 ||
        state.capabilityIndexWidth < 240 ||
        state.capabilityIndexWidth > 300
      ) {
        problems.push(
          `${stage} desktop capability index mismatch (spread ${state.capabilitySelectorTopSpread.toFixed(1)}, ` +
          `in viewport ${state.capabilitySelectorsInViewport}/6, width ${state.capabilityIndexWidth.toFixed(1)}px)`
        );
      }
    } else if (width > 688) {
      if (state.capabilitySelectorTopSpread > 1 || state.capabilitySelectorsInViewport !== 6) {
        problems.push(`${stage} tablet capability selectors are not one contained row (spread ${state.capabilitySelectorTopSpread.toFixed(1)}, in viewport ${state.capabilitySelectorsInViewport}/6)`);
      }
    } else if (
      state.capabilitySelectorTopSpread < 120 ||
      state.capabilitySelectorTopSpread > 160 ||
      state.capabilitySelectorsInViewport !== 6
    ) {
      problems.push(`${stage} mobile capability grid mismatch (spread ${state.capabilitySelectorTopSpread.toFixed(1)}, fully visible ${state.capabilitySelectorsInViewport}/6)`);
    }
    if (state.capabilitySelectorMaxHeight < 60 || state.capabilitySelectorMaxHeight > 80) {
      problems.push(`${stage} capability selector height ${state.capabilitySelectorMaxHeight.toFixed(1)}px, expected 60–80px`);
    }
    const selectorHeaderHeightRange = width > 1080 ? [154, 158] : [43.9, 58];
    if (
      state.capabilitySelectorHeaderHeight < selectorHeaderHeightRange[0] ||
      state.capabilitySelectorHeaderHeight > selectorHeaderHeightRange[1] ||
      !/^Capabilities\b/i.test(state.capabilitySelectorHeaderText) ||
      !/Best with Vasir \/100/i.test(state.capabilitySelectorHeaderText) ||
      state.capabilitySelectorMarkerCount !== 1 ||
      state.selectedCapabilityViewingText !== 'Selected'
    ) {
      problems.push(`${stage} capability selector header/state mismatch (${state.capabilitySelectorHeaderHeight.toFixed(1)}px): ${state.capabilitySelectorHeaderText} / ${state.selectedCapabilityViewingText || '(no Selected)'}`);
    }
    if (
      state.capabilityModeHeight < 48 ||
      state.capabilityModeHeight > 72 ||
      Math.abs(state.capabilityModeWidth - state.capabilityCanvasWidth) > 2 ||
      Math.abs(state.capabilityModeHeaderGap) > 1 ||
      Math.abs(state.capabilityModeContentGap) > 5 ||
      state.capabilityModeFirstTabOffset > (width <= 688 ? 2 : 96) ||
      state.capabilityModeLabelVisible !== (width > 688) ||
      state.capabilityModeLabelText !== 'View'
    ) {
      problems.push(
        `${stage} capability view rail is not attached to its content: ` +
        `${state.capabilityModeWidth.toFixed(1)}×${state.capabilityModeHeight.toFixed(1)}px, ` +
        `header gap ${state.capabilityModeHeaderGap.toFixed(1)}, content gap ${state.capabilityModeContentGap.toFixed(1)}, ` +
        `first tab ${state.capabilityModeFirstTabOffset.toFixed(1)}px from canvas, max tab ${state.capabilityModeTabMaxWidth.toFixed(1)}px`
      );
    }
    if (state.expectedMode === 'models') {
      const isCombined = state.selectedCapabilityCategory === 'overall';
      if (isCombined) {
        if (state.combinedSettingRowCount !== 10 || state.capabilityRowCount !== 0) {
          problems.push(`${stage} Combined model mode has ${state.combinedSettingRowCount}/10 paired rows and ${state.capabilityRowCount} dot rows`);
        }
        if (!state.hasShowAll) problems.push(`${stage} Combined model mode has no #show-all`);
        if (
          state.capabilityHeaderHeight < (width <= 688 ? 180 : 110) ||
          state.capabilityHeaderHeight > (width <= 688 ? 300 : 210) ||
          state.capabilityHeaderReadingCount !== 3 ||
          !/20 matched settings/i.test(state.capabilityHeaderText) ||
          !/ranked by With Vasir/i.test(state.capabilityHeaderText) ||
          !/Best with Vasir/i.test(state.capabilityHeaderText) ||
          !/Median uplift/i.test(state.capabilityHeaderText) ||
          !/Improved settings/i.test(state.capabilityHeaderText)
        ) {
          problems.push(`${stage} Combined canvas header mismatch (${state.capabilityHeaderHeight.toFixed(1)}px): ${state.capabilityHeaderText}`);
        }
        if (
          state.capabilityAxisHeight < (width <= 688 ? 48 : 60) ||
          state.capabilityAxisHeight > 100 ||
          !/Rank \/ model setting/i.test(state.capabilityAxisText) ||
          !/Capability scores/i.test(state.capabilityAxisText) ||
          state.combinedProfileMetricLabel !== 'Overall' ||
          state.combinedEffectLabel !== 'Uplift' ||
          state.combinedConditionHintCount !== 0 ||
          /Shared scale|Without shown below|With Vasir above|Overall uplift/i.test(state.capabilityAxisText)
        ) {
          problems.push(`${stage} Combined structural axis mismatch (${state.capabilityAxisHeight.toFixed(1)}px): ${state.capabilityAxisText}`);
        }
        if (width <= 390 && state.visibleCombinedRowsInViewport < 1) {
          problems.push(`${stage} mobile shows no Combined paired row in viewport`);
        }
      } else {
        if (state.capabilityRowCount !== 20 || state.combinedSettingRowCount !== 0) {
          problems.push(`${stage} named capability model mode has ${state.capabilityRowCount}/20 dot rows and ${state.combinedSettingRowCount} paired rows`);
        }
        if (state.hasShowAll) problems.push(`${stage} named capability unexpectedly has #show-all`);
        if (
          state.capabilityHeaderHeight < (width <= 688 ? 150 : 110) ||
          state.capabilityHeaderHeight > (width <= 688 ? 250 : 210) ||
          state.capabilityHeaderReadingCount !== 2 ||
          !/20 matched settings/i.test(state.capabilityHeaderText) ||
          !/ranked by With Vasir/i.test(state.capabilityHeaderText) ||
          !/Leader with Vasir/i.test(state.capabilityHeaderText) ||
          !/Best without/i.test(state.capabilityHeaderText)
        ) {
          problems.push(`${stage} named capability canvas header mismatch (${state.capabilityHeaderHeight.toFixed(1)}px): ${state.capabilityHeaderText}`);
        }
        if (
          state.capabilityAxisHeight < 34 ||
          state.capabilityAxisHeight > 58 ||
          !/Rank \/ model/i.test(state.capabilityAxisText) ||
          !/Without/i.test(state.capabilityAxisText) ||
          !/With/i.test(state.capabilityAxisText) ||
          !/Change/i.test(state.capabilityAxisText)
        ) {
          problems.push(`${stage} named capability axis mismatch (${state.capabilityAxisHeight.toFixed(1)}px): ${state.capabilityAxisText}`);
        }
        if (width <= 390 && state.completeCapabilityRowsInViewport < 1) {
          problems.push(`${stage} mobile shows no complete named capability row in viewport`);
        }
      }
    } else if (state.expectedMode === 'benchmarks') {
      const expectedRows = expectedBenchmarkCounts[state.selectedCapabilityCategory];
      if (
        state.capabilityHeaderHeight < (width <= 688 ? 150 : 110) ||
        state.capabilityHeaderHeight > (width <= 688 ? 250 : 210) ||
        state.capabilityHeaderReadingCount !== 2 ||
        !/tracks/i.test(state.capabilityHeaderText) ||
        !/benchmark tests/i.test(state.capabilityHeaderText) ||
        !/Evidence/i.test(state.capabilityHeaderText) ||
        !/Preview/i.test(state.capabilityHeaderText)
      ) {
        problems.push(`${stage} benchmark canvas header mismatch (${state.capabilityHeaderHeight.toFixed(1)}px): ${state.capabilityHeaderText}`);
      }
      if (state.capabilityRowCount !== 0) problems.push(`${stage} benchmark mode leaked ${state.capabilityRowCount} model rows`);
      if (state.benchmarkTrackCount !== expectedTrackCounts[state.selectedCapabilityCategory] || state.benchmarkRowCount !== expectedRows) {
        problems.push(`${stage} benchmark mode has ${state.benchmarkTrackCount}/${expectedTrackCounts[state.selectedCapabilityCategory]} tracks and ${state.benchmarkRowCount}/${expectedRows} tests`);
      }
      const expectedMeasured = state.selectedCapabilityCategory === 'engineering' ? 3 : 0;
      if (
        state.benchmarkMeasuredRowCount !== expectedMeasured ||
        state.benchmarkIllustrativeRowCount !== expectedRows - expectedMeasured
      ) {
        problems.push(
          `${stage} benchmark evidence kinds measured=${state.benchmarkMeasuredRowCount}/${expectedMeasured}, ` +
          `illustrative=${state.benchmarkIllustrativeRowCount}/${expectedRows - expectedMeasured}`
        );
      }
    } else {
      const fieldLabels = {
        overall: 'Combined',
        engineering: 'Engineering',
        games: 'Games',
        product: 'Product Design',
        writing: 'Writing',
        workflows: 'AI Workflows'
      };
      const label = fieldLabels[state.selectedCapabilityCategory] || '';
      if (state.plotPointCount !== 60) problems.push(`${stage} efficiency view has ${state.plotPointCount}/60 plot points`);
      if (state.efficiencySelectCount !== 2 || state.efficiencyQualityFieldCount !== 0) {
        problems.push(`${stage} efficiency controls have ${state.efficiencySelectCount}/2 selects and ${state.efficiencyQualityFieldCount} duplicate quality selectors`);
      }
      if (!state.efficiencyTitle.includes(`${label} score`) || !state.efficiencyYAxis.includes(`${label} score / 100`)) {
        problems.push(`${stage} efficiency context mismatch: ${state.efficiencyTitle} / ${state.efficiencyYAxis}`);
      }
      if (state.capabilityRowCount !== 0 || state.combinedSettingRowCount !== 0 || state.benchmarkRowCount !== 0) {
        problems.push(`${stage} efficiency view leaked ranking/benchmark rows`);
      }
    }
    if (state.obsoleteCapabilityBlocks !== 0) {
      problems.push(`${stage} found ${state.obsoleteCapabilityBlocks} obsolete capability summary block(s)`);
    }
  }
  return problems;
}

let socket;
try {
  const port = await waitFor(() => {
    if (!fs.existsSync(portFile)) return null;
    return fs.readFileSync(portFile, 'utf8').trim().split('\n')[0] || null;
  });
  socket = await connect(port);
  const protocol = createProtocol(socket);
  const runtimeExceptions = [];
  protocol.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    runtimeExceptions.push(exceptionDetails.exception?.description || exceptionDetails.text || 'Unknown runtime exception');
  });

  const evaluate = async (expression, awaitPromise = false) => {
    const response = await protocol.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Runtime evaluation failed');
    }
    return response.result.value;
  };

  await protocol.send('Page.enable');
  await protocol.send('Runtime.enable');
  await protocol.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    screenWidth: width,
    screenHeight: height,
    deviceScaleFactor: 1,
    mobile: false
  });
  await protocol.send('Emulation.setTouchEmulationEnabled', { enabled: false, maxTouchPoints: 1 });

  const loaded = protocol.once('Page.loadEventFired');
  await protocol.send('Page.navigate', { url: pageUrl.href });
  await loaded;
  await evaluate(
    'document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => { window.scrollTo(0, 0); resolve(true); }))))',
    true
  );
  const kanitReady = await evaluate(
    "document.fonts.load('900 32px Kanit').then(() => document.fonts.check('900 32px Kanit'))",
    true
  );

  const capturedState = isReportCapture ? null : await evaluate(capabilitySnapshotExpression(captureCapabilityCategory, captureCapabilityMode), true);
  await evaluate(
    `new Promise((resolve) => {
      let remainingFrames = 4;
      const pinTop = () => {
        window.scrollTo(0, 0);
        remainingFrames -= 1;
        if (remainingFrames === 0) resolve(true);
        else requestAnimationFrame(pinTop);
      };
      requestAnimationFrame(pinTop);
    })`,
    true
  );
  const capturedScrollY = await evaluate('window.scrollY');
  if (
    captureTarget === 'leaderboard' &&
    width > 1080 &&
    Number.isFinite(scoreGuidePreview) &&
    scoreGuidePreview >= 0 &&
    scoreGuidePreview <= 100
  ) {
    const target = await evaluate(combinedScoreGuideTargetExpression(scoreGuidePreview, 2));
    if (target.found) {
      await protocol.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: target.point.x,
        y: target.point.y
      });
      await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', true);
    }
  }
  const initialAudit = await evaluate(auditExpression);
  const screenshot = await protocol.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  const screenshotBuffer = Buffer.from(screenshot.data, 'base64');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, screenshotBuffer);
  const capturedWidth = screenshotBuffer.readUInt32BE(16);
  const capturedHeight = screenshotBuffer.readUInt32BE(20);

  if (isReportCapture) {
    const reportAudit = await evaluate(reportAuditExpression);
    const reportRouteAudit = await evaluate(reportRouteAuditExpression, true);
    const finalAudit = await evaluate(auditExpression);
    const problems = [
      ...auditProblems('initial', { ...initialAudit, brokenHashes: [] }),
      ...auditProblems('post-render', { ...finalAudit, brokenHashes: [] }),
      ...reportAudit.failures,
      ...reportRouteAudit.failures
    ];
    if (capturedScrollY !== 0) problems.push(`capture scroll position ${capturedScrollY}px, expected top`);
    if (
      reportRouteAudit.routeCount !== 24 ||
      reportRouteAudit.developmentCount !== 3 ||
      reportRouteAudit.illustrativeCount !== 21 ||
      reportRouteAudit.restoredHash !== '#hyper-scale-chat'
    ) {
      problems.push(
        `report route manifest ${reportRouteAudit.routeCount}/24 with ` +
        `${reportRouteAudit.developmentCount}/3 development and ` +
        `${reportRouteAudit.illustrativeCount}/21 illustrative routes; restored ${reportRouteAudit.restoredHash || '(empty)'}`
      );
    }
    if (capturedWidth !== width || capturedHeight !== height) {
      problems.push(`PNG dimensions ${capturedWidth}×${capturedHeight}, expected ${width}×${height}`);
    }
    if (runtimeExceptions.length) {
      problems.push(`${runtimeExceptions.length} runtime exception(s): ${runtimeExceptions.slice(0, 3).join(' | ')}`);
    }
    if (!kanitReady) problems.push('bundled Kanit 900 font did not load');
    const status = problems.length ? `QA FAIL · ${problems.join('; ')}` : 'QA clean';
    const summary = `${path.basename(destination)} · #report/hyper-scale-chat · ${capturedWidth}×${capturedHeight} · ${status} · measured ${reportAudit.baseline}→${reportAudit.treatment} (${reportAudit.delta > 0 ? '+' : ''}${reportAudit.delta}) / ${reportAudit.completion} / ${reportAudit.record} / ${reportAudit.breadcrumbLinks} breadcrumb links / ${reportAudit.sourceLinks} public source links / ${reportRouteAudit.routeCount}/24 fragment routes / illustrative disclaimer ${reportAudit.disclaimerVisible ? 'visible' : 'missing'}`;
    if (problems.length) {
      console.error(summary);
      process.exitCode = 1;
    } else {
      console.log(summary);
    }
  } else {
  let capabilitySelectorInkAudit = { skipped: true };
  if (width > 1080) {
    const resting = await evaluate(capabilitySelectorInkExpression('games'));
    if (resting.found) {
      await protocol.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: resting.tab.left + (resting.tab.width / 2),
        y: resting.tab.top + (resting.tab.height / 2)
      });
      await evaluate('new Promise((resolve) => setTimeout(resolve, 240))', true);
      const hovered = await evaluate(capabilitySelectorInkExpression('games'));
      capabilitySelectorInkAudit = { skipped: false, resting, hovered };
      await protocol.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: width - 2, y: height - 2 });
    }
  }
  let combinedScoreGuideAudit = { skipped: true };
  if (width > 1080) {
    await evaluate(activateCapabilityRouteExpression('overall', 'models'), true);
    const collapsedTarget = await evaluate(combinedScoreGuideTargetExpression(73.4, 2));
    if (collapsedTarget.found) {
      const hiddenBefore = await evaluate(combinedScoreGuideStateExpression);
      await protocol.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: collapsedTarget.point.x,
        y: collapsedTarget.point.y
      });
      await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', true);
      const pointer = await evaluate(combinedScoreGuideStateExpression);

      await evaluate(`new Promise((resolve) => {
        document.querySelector('.score-field--combined #show-all')?.click();
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
      })`, true);
      const expandedTarget = await evaluate(combinedScoreGuideTargetExpression(41.2, 2));
      await protocol.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: expandedTarget.point.x,
        y: expandedTarget.point.y
      });
      await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', true);
      const expanded = await evaluate(combinedScoreGuideStateExpression);

      await protocol.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
      await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', true);
      const hiddenAfter = await evaluate(combinedScoreGuideStateExpression);

      await evaluate(`new Promise((resolve) => {
        document.querySelector('.score-field--combined #show-all')?.click();
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
      })`, true);
      const focusSetup = await evaluate(combinedScoreGuideFocusExpression);
      await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', true);
      const focus = await evaluate(combinedScoreGuideStateExpression);
      await evaluate('document.activeElement?.blur(); true');
      await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', true);
      const focusCleared = await evaluate(combinedScoreGuideStateExpression);

      combinedScoreGuideAudit = {
        skipped: false,
        collapsedTarget,
        hiddenBefore,
        pointer,
        expandedTarget,
        expanded,
        hiddenAfter,
        focusSetup,
        focus,
        focusCleared
      };
    }
    await protocol.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: width - 2, y: height - 2 });
    await evaluate(activateCapabilityRouteExpression(captureCapabilityCategory, captureCapabilityMode), true);
  }
  const smoke = await evaluate(navigationInteractionExpression(captureCapabilityCategory, captureCapabilityMode), true);
  const compositionSmoke = await evaluate(
    leaderboardCompositionExpression(captureCapabilityCategory, captureCapabilityMode),
    true
  );
  const capabilityAudit = await evaluate(
    capabilityAuditExpression(captureCapabilityCategory, captureCapabilityMode),
    true
  );
  const capabilityBenchmarkAudit = await evaluate(
    capabilityBenchmarkAuditExpression(captureCapabilityCategory, captureCapabilityMode),
    true
  );
  const efficiencyContextAudit = await evaluate(
    efficiencyContextAuditExpression(captureCapabilityCategory, captureCapabilityMode),
    true
  );

  await evaluate(activateCapabilityRouteExpression(captureCapabilityCategory, 'efficiency'), true);
  const interactionAudit = await evaluate(auditExpression);
  const plotInspectionSmoke = await evaluate(plotInspectionSmokeExpression, true);
  const keyboardResults = [];
  const keyboardSampleCount = Math.min(3, interactionAudit.plotPointCount);

  for (let index = 0; index < keyboardSampleCount; index += 1) {
    const setup = await evaluate(plotPointSetupExpression(index));
    await protocol.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Enter',
      code: 'Enter',
      text: '\r',
      unmodifiedText: '\r',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13
    });
    await protocol.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13
    });
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', true);
    const activation = await evaluate('window.__captureQaKeyboard');
    keyboardResults.push({ key: 'Enter', setup, activation });
  }

  if (interactionAudit.plotPointCount > 0) {
    const setup = await evaluate(plotPointSetupExpression(0));
    await protocol.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: ' ',
      code: 'Space',
      text: ' ',
      windowsVirtualKeyCode: 32,
      nativeVirtualKeyCode: 32
    });
    await protocol.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: ' ',
      code: 'Space',
      windowsVirtualKeyCode: 32,
      nativeVirtualKeyCode: 32
    });
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', true);
    const activation = await evaluate('window.__captureQaKeyboard');
    keyboardResults.push({ key: 'Space', setup, activation });
  }

  const plotPointerSmoke = await evaluate(plotPointerSmokeExpression, true);
  await evaluate(activateCapabilityRouteExpression(captureCapabilityCategory, captureCapabilityMode), true);
  const finalCapabilityState = await evaluate(capabilitySnapshotExpression(captureCapabilityCategory, captureCapabilityMode), true);
  const finalAudit = await evaluate(auditExpression);
  const problems = [
    ...capabilityStateProblems('initial', capturedState),
    ...capabilityStateProblems('post-interaction', finalCapabilityState),
    ...auditProblems('initial', initialAudit),
    ...auditProblems('post-interaction', finalAudit)
  ];
  if (capturedScrollY !== 0) problems.push(`capture scroll position ${capturedScrollY}px, expected top`);
  const hashMatchesCapabilityRoute = (hash) => /^#capabilities\/(overall|engineering|games|product|writing|workflows)(?:\/(benchmarks|efficiency))?$/.test(hash);
  const expectedCaptureHash = capabilityRoute(captureCapabilityCategory, captureCapabilityMode);

  if (capturedWidth !== width || capturedHeight !== height) {
    problems.push(`PNG dimensions ${capturedWidth}×${capturedHeight}, expected ${width}×${height}`);
  }
  if (runtimeExceptions.length) {
    problems.push(`${runtimeExceptions.length} runtime exception(s): ${runtimeExceptions.slice(0, 3).join(' | ')}`);
  }
  if (!kanitReady) problems.push('bundled Kanit 900 font did not load');
  if (!capabilitySelectorInkAudit.skipped) {
    const { resting, hovered } = capabilitySelectorInkAudit;
    const hoverColors = Object.values(hovered.colors);
    if (
      !resting.hoverCapable ||
      resting.selected ||
      resting.ink.opacity < 0.99 ||
      resting.ink.width < 8 ||
      resting.ink.width > 16 ||
      hovered.ink.width < hovered.tab.width - 2 ||
      hoverColors.some((color) => color !== hovered.paperColor) ||
      Math.abs(resting.tab.width - hovered.tab.width) > 0.5 ||
      Math.abs(resting.tab.height - hovered.tab.height) > 0.5
    ) {
      problems.push(
        `category ink treatment rest ${resting.ink.width.toFixed(1)}px/${resting.ink.opacity.toFixed(2)} → ` +
        `hover ${hovered.ink.width.toFixed(1)}px of ${hovered.tab.width.toFixed(1)}px, ` +
        `colors ${hoverColors.join(', ')}, paper ${hovered.paperColor}`
      );
    }
  }
  if (width > 1080 && combinedScoreGuideAudit.skipped) {
    problems.push('combined score guide audit could not find its desktop chart target');
  }
  if (!combinedScoreGuideAudit.skipped) {
    const {
      collapsedTarget,
      hiddenBefore,
      pointer,
      expandedTarget,
      expanded,
      hiddenAfter,
      focusSetup,
      focus,
      focusCleared
    } = combinedScoreGuideAudit;
    const closeTo = (actual, expected, tolerance = 1) => (
      Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance
    );
    const geometryStayedPut = (target, state) => (
      closeTo(state.field.left, target.field.left, 0.5) &&
      closeTo(state.field.width, target.field.width, 0.5) &&
      closeTo(state.list.left, target.list.left, 0.5) &&
      closeTo(state.list.width, target.list.width, 0.5) &&
      closeTo(state.rowBoxes[0]?.left, target.rowBoxes[0]?.left, 0.5) &&
      closeTo(state.rowBoxes[0]?.width, target.rowBoxes[0]?.width, 0.5)
    );
    const pointerGeometryPassed = (
      hiddenBefore.found &&
      !collapsedTarget.guideInitiallyVisible &&
      !hiddenBefore.visible &&
      !hiddenBefore.hasVisibleClass &&
      pointer.found &&
      pointer.visible &&
      pointer.source === 'pointer' &&
      closeTo(pointer.score, 73.4, 0.11) &&
      pointer.readout === '73.4/100' &&
      pointer.rowCount === 10 &&
      closeTo(pointer.line.centerX, collapsedTarget.point.x, 2) &&
      closeTo(pointer.line.top, pointer.list.top, 2) &&
      closeTo(pointer.line.bottom, pointer.list.bottom, 2) &&
      closeTo(pointer.line.width, 2, 0.25) &&
      geometryStayedPut(collapsedTarget, pointer)
    );
    if (!pointerGeometryPassed) {
      problems.push(`combined score guide collapsed pointer geometry failed: ${JSON.stringify({ collapsedTarget, hiddenBefore, pointer })}`);
    }

    const expandedGeometryPassed = (
      expandedTarget.found &&
      expandedTarget.rowCount === 20 &&
      expanded.found &&
      expanded.visible &&
      expanded.source === 'pointer' &&
      closeTo(expanded.score, 41.2, 0.11) &&
      expanded.readout === '41.2/100' &&
      expanded.rowCount === 20 &&
      closeTo(expanded.line.centerX, expandedTarget.point.x, 2) &&
      closeTo(expanded.line.top, expanded.list.top, 2) &&
      closeTo(expanded.line.bottom, expanded.list.bottom, 2) &&
      closeTo(expanded.line.width, 2, 0.25) &&
      Math.abs(expanded.line.centerX - pointer.line.centerX) > 40 &&
      geometryStayedPut(expandedTarget, expanded)
    );
    if (!expandedGeometryPassed) {
      problems.push(`combined score guide expanded pointer geometry failed: ${JSON.stringify({ expandedTarget, expanded })}`);
    }

    if (
      !hiddenAfter.found ||
      hiddenAfter.visible ||
      hiddenAfter.hasVisibleClass ||
      hiddenAfter.score !== null ||
      hiddenAfter.source !== ''
    ) {
      problems.push(`combined score guide did not clear after pointer exit: ${JSON.stringify(hiddenAfter)}`);
    }

    const focusExpectedX = focus.track.left + ((focusSetup.expectedScore / 100) * focus.track.width);
    const focusPassed = (
      focusSetup.found &&
      focusSetup.focused &&
      focusSetup.segmentCount === 5 &&
      focusSetup.categoryId === 'product' &&
      focus.found &&
      focus.visible &&
      focus.source === 'focus' &&
      focus.activeSegment &&
      closeTo(focus.score, focusSetup.expectedScore, 0.002) &&
      focus.readout === `${focusSetup.expectedScore.toFixed(1)}/100` &&
      closeTo(focus.line.centerX, focusExpectedX, 2) &&
      closeTo(focus.line.top, focus.list.top, 2) &&
      closeTo(focus.line.bottom, focus.list.bottom, 2)
    );
    if (!focusPassed) {
      problems.push(`combined score guide focus geometry failed: ${JSON.stringify({ focusSetup, focus, focusExpectedX })}`);
    }
    if (
      !focusCleared.found ||
      focusCleared.visible ||
      focusCleared.hasVisibleClass ||
      focusCleared.score !== null ||
      focusCleared.source !== ''
    ) {
      problems.push(`combined score guide did not clear after focus exit: ${JSON.stringify(focusCleared)}`);
    }
  }
  if (!smoke.selectionChanged || !smoke.selectionPersistent) {
    problems.push(
      `selection persistence changed=${smoke.selectionChanged}, across views=${smoke.selectionPersistent}, ` +
      `requested=${smoke.requestedSelection || '(none)'}, retained=${smoke.persistentSelection || '(none)'}`
    );
  }
  smoke.modeRoutes.forEach((route) => {
    if (
      route.selectedMode !== route.mode ||
      route.hash !== capabilityRoute('overall', route.mode) ||
      !route.panelVisible ||
      route.selectedEntry !== smoke.persistentSelection
    ) {
      problems.push(
        `view route ${route.mode}: selected=${route.selectedMode || '(none)'}, hash=${route.hash || '(empty)'}, ` +
        `panel=${route.panelVisible}, selection=${route.selectedEntry || '(none)'}`
      );
    }
  });
  if (smoke.selects.total !== 2 || smoke.selects.eligible !== 2 || smoke.selects.exercised !== smoke.selects.eligible) {
    problems.push(`native select smoke exercised ${smoke.selects.exercised}/${smoke.selects.eligible}; expected exactly 2 controls`);
  }
  if (
    !smoke.showAll.found ||
    !smoke.showAll.changed ||
    !smoke.showAll.restored ||
    smoke.showAll.before.rows !== 10 ||
    smoke.showAll.after.rows !== 20 ||
    !/\b20\b/.test(smoke.showAll.before.text)
  ) {
    problems.push(
      `show-all found=${smoke.showAll.found}, changed=${smoke.showAll.changed}, restored=${smoke.showAll.restored}, ` +
      `rows=${smoke.showAll.before.rows}→${smoke.showAll.after.rows}, label=${smoke.showAll.before.text || '(empty)'}`
    );
  }
  if (smoke.plotPointCount !== 60) problems.push(`efficiency smoke found ${smoke.plotPointCount}/60 plot points`);
  if (smoke.globalLensControlCount !== 0) problems.push(`obsolete global lens chrome found during smoke (${smoke.globalLensControlCount})`);
  if (smoke.hasEffectTab || smoke.hasEffectPanel) problems.push('obsolete Vasir effect tab/panel found during smoke');
  if (smoke.returnedMode !== captureCapabilityMode || smoke.returnedHash !== expectedCaptureHash) {
    problems.push(`smoke returned ${smoke.returnedMode || '(none)'} at ${smoke.returnedHash || '(empty)'}`);
  }
  [
    { result: compositionSmoke.collapsed, expectedRows: 10 },
    { result: compositionSmoke.expanded, expectedRows: 20 }
  ].forEach(({ result, expectedRows }) => {
    if (result.rowCount !== expectedRows || result.checkedCount !== expectedRows || result.failures.length) {
      problems.push(
        `${result.phase} capability compositions checked ${result.checkedCount}/${result.rowCount} rows, ` +
        `expected ${expectedRows}: ${result.failures.slice(0, 16).join(' | ')}`
      );
    }
  });
  if (
    !compositionSmoke.showAllFound ||
    compositionSmoke.restoredRows !== 10 ||
    compositionSmoke.obsoleteBaselineCount !== 0 ||
    compositionSmoke.returnedMode !== captureCapabilityMode ||
    compositionSmoke.returnedHash !== expectedCaptureHash
  ) {
    problems.push(
      `composition route show-all=${compositionSmoke.showAllFound}, restored rows=${compositionSmoke.restoredRows}, ` +
      `obsolete baselines=${compositionSmoke.obsoleteBaselineCount}, ` +
      `returned=${compositionSmoke.returnedMode || '(none)'} at ${compositionSmoke.returnedHash || '(empty)'}`
    );
  }
  if (capabilityAudit.initialSelection !== capabilityAudit.selectionAfterCategories) {
    problems.push(`category switching changed shared selection ${capabilityAudit.initialSelection}→${capabilityAudit.selectionAfterCategories}`);
  }
  capabilityAudit.categoryAudits.forEach((audit) => {
    const expectedRows = audit.category === 'overall' ? 10 : 20;
    const expectedKind = audit.category === 'overall' ? 'paired' : 'dot';
    const expectedReadings = audit.category === 'overall' ? 3 : 2;
    if (
      audit.rowCount !== expectedRows ||
      audit.rowKind !== expectedKind ||
      audit.headerReadingCount !== expectedReadings ||
      audit.failures.length
    ) {
      problems.push(
        `${audit.category} capability audit ${audit.rowCount}/${expectedRows} ${audit.rowKind || '(unknown)'} rows, ` +
        `${audit.headerReadingCount}/${expectedReadings} summaries: ${audit.failures.slice(0, 18).join(' | ')}`
      );
    }
  });
  if (
    capabilityAudit.categoryKeyboard.afterArrow !== 'games' ||
    capabilityAudit.categoryKeyboard.focusedAfterArrow !== 'games' ||
    capabilityAudit.categoryKeyboard.hashAfterArrow !== '#capabilities/games' ||
    capabilityAudit.categoryKeyboard.afterHome !== 'overall' ||
    capabilityAudit.categoryKeyboard.focusedAfterHome !== 'overall' ||
    capabilityAudit.categoryKeyboard.hashAfterHome !== '#capabilities/overall'
  ) {
    problems.push(`capability tab keyboard path failed: ${JSON.stringify(capabilityAudit.categoryKeyboard)}`);
  }
  capabilityAudit.segmentSemantics.forEach((semantics) => {
    if (
      semantics.count !== 5 ||
      semantics.nativeButtons !== 5 ||
      semantics.toolbarCount !== 1 ||
      semantics.rovingZeroCount !== 1 ||
      semantics.minimumWidth < 23.99 ||
      semantics.minimumHeight < 23.99 ||
      semantics.focusedAfterArrow !== 'games' ||
      !semantics.stayedOnCombined
    ) {
      problems.push(`${semantics.condition} composition segment semantics failed: ${JSON.stringify(semantics)}`);
    }
  });
  if (capabilityAudit.drilldowns.length !== 10) {
    problems.push(`segment drilldown exercised ${capabilityAudit.drilldowns.length}/10 category-condition routes`);
  }
  capabilityAudit.drilldowns.forEach((drill) => {
    if (
      !drill.nativeButton ||
      drill.mode !== 'models' ||
      drill.hash !== `#capabilities/${drill.category}` ||
      drill.selectedEntry !== capabilityAudit.initialSelection ||
      drill.selectedCategory !== drill.category ||
      !drill.selectedSettingVisible ||
      !drill.questionFocused
    ) {
      problems.push(`segment drill ${drill.condition}/${drill.category} failed: ${JSON.stringify(drill)}`);
    }
  });
  if (
    capabilityAudit.legacyLeaderboardRoute.hash !== '#capabilities/overall' ||
    capabilityAudit.legacyLeaderboardRoute.selectedCategory !== 'overall' ||
    capabilityAudit.legacyLeaderboardRoute.selectedMode !== 'models' ||
    capabilityAudit.legacyLeaderboardRoute.hasLeaderboardTab ||
    capabilityAudit.legacyLeaderboardRoute.hasLeaderboardPanel ||
    capabilityAudit.legacyLeaderboardRoute.hasGlobalLensNavigation
  ) {
    problems.push(`legacy #leaderboard alias failed: ${JSON.stringify(capabilityAudit.legacyLeaderboardRoute)}`);
  }
  if (
    capabilityAudit.legacyRoute.hash !== '#capabilities/engineering' ||
    capabilityAudit.legacyRoute.selectedCategory !== 'engineering' ||
    capabilityAudit.legacyRoute.hasEffectTab ||
    capabilityAudit.legacyRoute.hasEffectPanel
  ) {
    problems.push(`legacy #vasir-effect fallback failed: ${JSON.stringify(capabilityAudit.legacyRoute)}`);
  }
  if (
    capabilityAudit.legacyEfficiencyRoute.hash !== '#capabilities/overall/efficiency' ||
    capabilityAudit.legacyEfficiencyRoute.selectedCategory !== 'overall' ||
    capabilityAudit.legacyEfficiencyRoute.selectedMode !== 'efficiency' ||
    capabilityAudit.legacyEfficiencyRoute.hasStandaloneEfficiencyPanel
  ) {
    problems.push(`legacy #efficiency alias failed: ${JSON.stringify(capabilityAudit.legacyEfficiencyRoute)}`);
  }
  [
    ['bare #capabilities', capabilityAudit.bareCapabilitiesRoute],
    ['unknown hash', capabilityAudit.invalidRoute]
  ].forEach(([label, route]) => {
    if (
      route.hash !== '#capabilities/overall' ||
      route.selectedCategory !== 'overall' ||
      route.selectedMode !== 'models'
    ) {
      problems.push(`${label} fallback failed: ${JSON.stringify(route)}`);
    }
  });
  if (
    capabilityAudit.returnedMode !== captureCapabilityMode ||
    capabilityAudit.returnedHash !== capabilityAudit.expectedReturnedHash ||
    !hashMatchesCapabilityRoute(capabilityAudit.returnedHash)
  ) {
    problems.push(`capability audit returned ${capabilityAudit.returnedMode || '(none)'} at ${capabilityAudit.returnedHash || '(empty)'}`);
  }
  const modeKeyboardExpected = [
    { state: capabilityBenchmarkAudit.modeKeyboard.afterArrowRight, mode: 'benchmarks', hash: '#capabilities/engineering/benchmarks' },
    { state: capabilityBenchmarkAudit.modeKeyboard.afterHome, mode: 'models', hash: '#capabilities/engineering' },
    { state: capabilityBenchmarkAudit.modeKeyboard.afterEnd, mode: 'efficiency', hash: '#capabilities/engineering/efficiency' },
    { state: capabilityBenchmarkAudit.modeKeyboard.afterArrowLeft, mode: 'benchmarks', hash: '#capabilities/engineering/benchmarks' }
  ];
  modeKeyboardExpected.forEach(({ state, mode, hash }, index) => {
    if (
      state.count !== 3 ||
      state.nativeButtons !== 3 ||
      state.roles.some((role) => role !== 'tab') ||
      state.selectedCount !== 1 ||
      state.selectedMode !== mode ||
      state.focusedMode !== mode ||
      state.rovingZeroCount !== 1 ||
      state.tabIndexes[mode] !== 0 ||
      Object.entries(state.tabIndexes).some(([candidate, tabIndex]) => candidate !== mode && tabIndex !== -1) ||
      state.hash !== hash ||
      !state.controlledPanelExists
    ) {
      problems.push(`capability mode keyboard path ${index + 1} failed: ${JSON.stringify(state)}`);
    }
  });
  const benchmarkCountContract = { engineering: 5, games: 5, product: 5, writing: 4, workflows: 5 };
  capabilityBenchmarkAudit.categoryAudits.forEach((audit) => {
    const expectedTests = benchmarkCountContract[audit.category];
    const expectedMeasured = audit.category === 'engineering' ? 3 : 0;
    if (
      audit.trackCount !== 2 ||
      audit.testCount !== expectedTests ||
      audit.measuredCount !== expectedMeasured ||
      audit.illustrativeCount !== expectedTests - expectedMeasured ||
      audit.modelRoute !== `#capabilities/${audit.category}` ||
      audit.failures.length
    ) {
      problems.push(
        `${audit.category} benchmark ledger ${audit.trackCount}/2 tracks × ${audit.testCount}/${expectedTests} tests, ` +
        `${audit.measuredCount} measured / ${audit.illustrativeCount} illustrative: ${audit.failures.slice(0, 20).join(' | ')}`
      );
    }
  });
  if (
    capabilityBenchmarkAudit.totalTracks !== 10 ||
    capabilityBenchmarkAudit.totalTests !== 24 ||
    capabilityBenchmarkAudit.developmentSummaryCount !== 3 ||
    capabilityBenchmarkAudit.developmentSourcesAbsent !== 3 ||
    capabilityBenchmarkAudit.illustrativeSummaryCount !== 21 ||
    capabilityBenchmarkAudit.illustrativeSourcesAbsent !== 21 ||
    capabilityBenchmarkAudit.measuredEngineering.join('|') !== capabilityBenchmarkAudit.expectedMeasuredEngineering.join('|')
  ) {
    problems.push(
      `benchmark fixture provenance mismatch: tracks=${capabilityBenchmarkAudit.totalTracks}/10, ` +
      `tests=${capabilityBenchmarkAudit.totalTests}/24, development=${capabilityBenchmarkAudit.developmentSummaryCount}/3 ` +
      `with ${capabilityBenchmarkAudit.developmentSourcesAbsent}/3 source-free, illustrative=${capabilityBenchmarkAudit.illustrativeSummaryCount}/21 ` +
      `with ${capabilityBenchmarkAudit.illustrativeSourcesAbsent}/21 source-free, engineering=` +
      `${capabilityBenchmarkAudit.measuredEngineering.join(',')}`
    );
  }
  if (
    capabilityBenchmarkAudit.returnedMode !== captureCapabilityMode ||
    capabilityBenchmarkAudit.returnedHash !== capabilityBenchmarkAudit.expectedReturnedHash ||
    !hashMatchesCapabilityRoute(capabilityBenchmarkAudit.returnedHash)
  ) {
    problems.push(
      `benchmark audit returned ${capabilityBenchmarkAudit.returnedMode || '(no local mode)'} ` +
      `at ${capabilityBenchmarkAudit.returnedHash || '(empty)'}`
    );
  }
  efficiencyContextAudit.fieldAudits.forEach((audit) => {
    if (audit.pointCount !== 60 || audit.selectCount !== 2 || audit.failures.length) {
      problems.push(`${audit.field} efficiency context ${audit.pointCount}/60 points, ${audit.selectCount}/2 selects: ${audit.failures.slice(0, 18).join(' | ')}`);
    }
  });
  if (
    efficiencyContextAudit.fieldAudits.length !== 6 ||
    efficiencyContextAudit.returnedMode !== captureCapabilityMode ||
    efficiencyContextAudit.returnedHash !== efficiencyContextAudit.expectedReturnedHash ||
    !hashMatchesCapabilityRoute(efficiencyContextAudit.returnedHash)
  ) {
    problems.push(`efficiency audit returned ${efficiencyContextAudit.returnedMode || '(none)'} at ${efficiencyContextAudit.returnedHash || '(empty)'}`);
  }
  if (!interactionAudit.plotPointCount) {
    problems.push('no keyboard-operable plot points found');
  }
  if (plotInspectionSmoke.failures.length || plotInspectionSmoke.rovingCount !== 1) {
    problems.push(`plot inspection/roving smoke: ${plotInspectionSmoke.failures.join(' | ') || `roving ${plotInspectionSmoke.rovingCount}/1`}`);
  }
  if (plotPointerSmoke.exercised !== interactionAudit.plotPointCount || plotPointerSmoke.failures.length) {
    problems.push(`plot pointer smoke exercised ${plotPointerSmoke.exercised}/${interactionAudit.plotPointCount}: ${plotPointerSmoke.failures.join(' | ')}`);
  }

  keyboardResults.forEach((result) => {
    const activated = result.activation && (result.activation.clicks > 0 || result.activation.handled);
    if (!result.setup.focused || !activated) {
      problems.push(`${result.key} did not activate plot point ${result.setup.label || '(unnamed)'} [focused=${result.setup.focused}, clicks=${result.activation?.clicks || 0}, handled=${Boolean(result.activation?.handled)}]`);
    }
  });

  const status = problems.length ? `QA FAIL · ${problems.join('; ')}` : 'QA clean';
  const selectorInkSummary = capabilitySelectorInkAudit.skipped
    ? 'category ink touch layout'
    : `category ink ${capabilitySelectorInkAudit.resting.ink.width.toFixed(0)}→${capabilitySelectorInkAudit.hovered.ink.width.toFixed(0)}px`;
  const scoreGuideSummary = combinedScoreGuideAudit.skipped
    ? 'score guide desktop only'
    : 'score guide pointer+focus across 10→20 rows';
  const summary = `${path.basename(destination)} · #${captureTarget} → ${expectedCaptureHash} · ${capturedWidth}×${capturedHeight} · ${status} · Kanit ${kanitReady ? 'ready' : 'missing'} / ${selectorInkSummary} / ${scoreGuideSummary} / ${smoke.modeRoutes.length}/3 local view routes / ${smoke.selects.exercised}/${smoke.selects.eligible} efficiency selects / show-all ${smoke.showAll.changed && smoke.showAll.restored ? 'toggle+restore' : 'failed'} / paired composition ${compositionSmoke.expanded.checkedCount}/20 settings × 2 conditions × 5 segments / capability fields 1 Combined × 10 paired + ${capabilityAudit.categoryAudits.length - 1}/5 named × 20 dot rows / benchmark mode 3 tabs × ${capabilityBenchmarkAudit.categoryAudits.length}/5 categories × ${capabilityBenchmarkAudit.totalTracks}/10 tracks × ${capabilityBenchmarkAudit.totalTests}/24 tests / efficiency ${efficiencyContextAudit.fieldAudits.length}/6 fields × 60 points / segment drill ${capabilityAudit.drilldowns.length}/10 / Full selection ${smoke.selectionPersistent ? 'persistent' : 'failed'} / ${plotPointerSmoke.exercised}/${plotPointerSmoke.total} plot pointer centers / hover+focus+roving inspection / ${keyboardResults.length} plot key paths`;
  if (problems.length) {
    console.error(summary);
    process.exitCode = 1;
  } else {
    console.log(summary);
  }
  }
} catch (error) {
  console.error(`Capture failed: ${error.message}`);
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
