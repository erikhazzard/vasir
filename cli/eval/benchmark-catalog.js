import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeBenchmarkReportData } from "./benchmark-report.js";

const FONT_DIRECTORY_PATH = fileURLToPath(new URL("./vendor/fonts/", import.meta.url));
const FONT_FILES = [
  ["Kanit", "kanit-900-italic.woff2.b64", 900, "italic"],
  ["Plus Jakarta Sans", "plus-jakarta-400.woff2.b64", 400, "normal"],
  ["Plus Jakarta Sans", "plus-jakarta-700.woff2.b64", 700, "normal"],
  ["JetBrains Mono", "jetbrains-mono-600.woff2.b64", 600, "normal"]
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderEmbeddedFontStyles() {
  return FONT_FILES.map(([family, fileName, weight, style]) => {
    const encodedFont = fs.readFileSync(path.join(FONT_DIRECTORY_PATH, fileName), "utf8")
      .replace(/\s+/g, "");
    return `@font-face{font-family:"${family}";src:url("data:font/woff2;base64,${encodedFont}") format("woff2");font-style:${style};font-weight:${weight};font-display:swap;}`;
  }).join("\n");
}

function readJson(runFilePath) {
  try {
    return JSON.parse(fs.readFileSync(runFilePath, "utf8"));
  } catch {
    return null;
  }
}

function runSortKey(record) {
  const completedAt = typeof record.run?.completedAt === "string" ? record.run.completedAt : "";
  const runId = typeof record.run?.runId === "string" ? record.run.runId : "";
  return `${completedAt}\u0000${runId}`;
}

function reportHref(benchmarkName, runId) {
  return `./${encodeURIComponent(benchmarkName)}/${encodeURIComponent(runId)}/report.html`;
}

function statusFromReport(run, report) {
  return run?.runStatus === "complete" && report.source.matrixComplete
    ? "complete"
    : "incomplete";
}

function normalizeCalibrationStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (!status || status === "unknown") {
    return "Not recorded";
  }
  if (status.includes("pending")) {
    return "Pending";
  }
  if (status.includes("uncalibrated")) {
    return "Uncalibrated";
  }
  if (status.includes("calibrated")) {
    return "Calibrated";
  }
  return status.replaceAll(/[-_]+/g, " ").replace(/^./, (character) => character.toUpperCase());
}

function normalizeAttempt(record) {
  const report = normalizeBenchmarkReportData(record.run);
  return {
    runId: report.runId,
    status: statusFromReport(record.run, report),
    completedRowCount: report.source.completedRowCount,
    expectedRowCount: report.source.expectedRowCount,
    href: reportHref(record.benchmarkName, report.runId)
  };
}

export function readBenchmarkCatalogRunRecords({ historyRootDirectory }) {
  if (!historyRootDirectory || !fs.existsSync(historyRootDirectory)) {
    return [];
  }

  const records = [];
  for (const benchmarkDirectoryEntry of fs.readdirSync(historyRootDirectory, { withFileTypes: true })) {
    if (!benchmarkDirectoryEntry.isDirectory()) {
      continue;
    }
    const benchmarkName = benchmarkDirectoryEntry.name;
    const benchmarkDirectoryPath = path.join(historyRootDirectory, benchmarkName);
    for (const runDirectoryEntry of fs.readdirSync(benchmarkDirectoryPath, { withFileTypes: true })) {
      if (!runDirectoryEntry.isDirectory()) {
        continue;
      }
      const runDirectoryPath = path.join(benchmarkDirectoryPath, runDirectoryEntry.name);
      const runFilePath = path.join(runDirectoryPath, "run.json");
      if (!fs.existsSync(runFilePath)) {
        continue;
      }
      const run = readJson(runFilePath);
      if (run?.kind !== "benchmark" || typeof run.runId !== "string") {
        continue;
      }
      records.push({
        benchmarkName,
        runDirectoryPath,
        runFilePath,
        reportFilePath: path.join(runDirectoryPath, "report.html"),
        run
      });
    }
  }
  return records.sort((left, right) => runSortKey(left).localeCompare(runSortKey(right)));
}

export function selectBenchmarkCatalogRuns(records) {
  const recordsByBenchmark = new Map();
  for (const record of records) {
    const benchmarkId = record.run?.benchmark?.id ?? record.run?.benchmarkName ?? record.benchmarkName;
    if (!recordsByBenchmark.has(benchmarkId)) {
      recordsByBenchmark.set(benchmarkId, []);
    }
    recordsByBenchmark.get(benchmarkId).push(record);
  }

  return [...recordsByBenchmark.entries()].map(([benchmarkId, benchmarkRecords]) => {
    const ordered = [...benchmarkRecords].sort((left, right) => runSortKey(left).localeCompare(runSortKey(right)));
    const latest = ordered.at(-1);
    const complete = ordered.filter((record) => {
      const report = normalizeBenchmarkReportData(record.run);
      return statusFromReport(record.run, report) === "complete";
    });
    return {
      benchmarkId,
      featured: complete.at(-1) ?? latest,
      latest
    };
  }).sort((left, right) => left.benchmarkId.localeCompare(right.benchmarkId));
}

export function normalizeBenchmarkCatalogEntry(selection) {
  const report = normalizeBenchmarkReportData(selection.featured.run);
  const featuredStatus = statusFromReport(selection.featured.run, report);
  const latestAttempt = normalizeAttempt(selection.latest);
  const featuredAttempt = normalizeAttempt(selection.featured);
  const hasNewerAttempt = latestAttempt.runId !== featuredAttempt.runId;
  return {
    benchmarkId: report.benchmarkId,
    title: report.benchmarkTitle,
    description: selection.featured.run?.benchmark?.definition?.description ?? "",
    prompt: report.prompt,
    featuredRunId: report.runId,
    featuredStatus,
    featuredHref: reportHref(selection.featured.benchmarkName, report.runId),
    completedRowCount: report.source.completedRowCount,
    expectedRowCount: report.source.expectedRowCount,
    observedLift: report.observedLift,
    bestConfiguration: report.bestConfiguration
      ? {
          label: report.bestConfiguration.configurationLabel,
          conditionLabel: report.bestConfiguration.conditionLabel,
          score: report.bestConfiguration.score
        }
      : null,
    calibrationStatus: normalizeCalibrationStatus(report.judge.calibrationStatus),
    scorerVersion: report.source.scorerVersion,
    latestAttempt: hasNewerAttempt ? latestAttempt : null
  };
}

function formatLift(value) {
  if (!Number.isFinite(value)) {
    return "No final score";
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} pts`;
}

function renderPromptEntry(entry, index) {
  const completionLabel = entry.featuredStatus === "complete" ? "Complete" : "Partial";
  const liftLabel = entry.featuredStatus === "complete"
    ? formatLift(entry.observedLift)
    : Number.isFinite(entry.observedLift)
      ? `Partial ${formatLift(entry.observedLift)}`
      : "No final score";
  const bestLabel = entry.bestConfiguration?.label ?? "No scored answer";
  const bestDetail = entry.bestConfiguration
    ? `${entry.bestConfiguration.conditionLabel} · ${entry.bestConfiguration.score.toFixed(1)}/100`
    : "Awaiting a complete score basis";
  const attemptWarning = entry.latestAttempt ? `
    <a class="catalog-entry__attempt" href="${escapeHtml(entry.latestAttempt.href)}">
      <span>Newer attempt needs attention</span>
      <span>${escapeHtml(entry.latestAttempt.completedRowCount)}/${escapeHtml(entry.latestAttempt.expectedRowCount)} responses · ${escapeHtml(entry.latestAttempt.runId)} →</span>
    </a>` : "";

  return `<article class="catalog-entry">
    <a class="catalog-entry__main" href="${escapeHtml(entry.featuredHref)}" aria-label="Open ${escapeHtml(entry.title)} report">
      <div class="catalog-entry__identity">
        <span class="catalog-entry__index">${String(index + 1).padStart(2, "0")} / prompt</span>
        <h2 class="catalog-entry__title">${escapeHtml(entry.title)}</h2>
        <p class="catalog-entry__prompt">“${escapeHtml(entry.prompt)}”</p>
      </div>
      <div class="catalog-entry__facts">
        <div class="catalog-fact">
          <span class="catalog-fact__label">Run</span>
          <strong class="catalog-fact__value">${completionLabel} ${escapeHtml(entry.completedRowCount)}/${escapeHtml(entry.expectedRowCount)}</strong>
          <span class="catalog-fact__detail">${escapeHtml(entry.featuredRunId)}</span>
        </div>
        <div class="catalog-fact">
          <span class="catalog-fact__label">Vasir lift</span>
          <strong class="catalog-fact__value catalog-fact__value--accent">${escapeHtml(liftLabel)}</strong>
          <span class="catalog-fact__detail">Prompt-local matched result</span>
        </div>
        <div class="catalog-fact">
          <span class="catalog-fact__label">Best observed</span>
          <strong class="catalog-fact__value">${escapeHtml(bestLabel)}</strong>
          <span class="catalog-fact__detail">${escapeHtml(bestDetail)}</span>
        </div>
        <div class="catalog-fact">
          <span class="catalog-fact__label">Calibration</span>
          <strong class="catalog-fact__value">${escapeHtml(entry.calibrationStatus)}</strong>
          <span class="catalog-fact__detail">${escapeHtml(entry.scorerVersion)}</span>
        </div>
      </div>
      <span class="catalog-entry__open" aria-hidden="true">Open report →</span>
    </a>${attemptWarning}
  </article>`;
}

const CATALOG_STYLES = String.raw`
  :root{--canvas:#f3f1ea;--ink:#151515;--line:#d9d6cd;--surface:#0c0d0f;--raised:#17191c;--white:#fff;--muted:rgba(255,255,255,.62);--dim:rgba(255,255,255,.42);--border:rgba(255,255,255,.2);--lime:#dfff65;--blue:#1769ff;--coral:#ff6d5e;--frame:min(92rem,calc(100vw - 3rem));--body:"Plus Jakarta Sans","Helvetica Neue",sans-serif;--display:"Kanit","Arial Black",sans-serif;--mono:"JetBrains Mono",monospace}
  *{box-sizing:border-box}html{background:var(--canvas);color-scheme:light}body{margin:0;min-width:20rem;background:var(--canvas);color:var(--ink);font-family:var(--body);-webkit-font-smoothing:antialiased}a{color:inherit}.catalog-header{background:var(--canvas);border-bottom:1px solid var(--line)}.catalog-header__inner{width:var(--frame);min-height:5.5rem;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:2rem}.catalog-brand{text-decoration:none;text-transform:uppercase;font-weight:700;font-size:1.05rem;letter-spacing:-.02em}.catalog-brand span{margin-left:.5rem;color:var(--blue);font-family:var(--mono);font-size:.72rem;letter-spacing:.14em}.catalog-header__meta{font-family:var(--mono);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#5f5e59}.catalog-main{width:var(--frame);margin:0 auto 3rem;background:var(--surface);color:var(--white)}.catalog-hero{padding:clamp(3rem,7vw,6.5rem) clamp(1.5rem,4vw,4.5rem) 3.5rem}.catalog-kicker,.catalog-fact__label,.catalog-entry__index,.catalog-rollup__label{display:block;color:var(--lime);font-family:var(--mono);font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase}.catalog-hero__title{max-width:18ch;margin:.85rem 0 1rem;font-family:var(--display);font-size:clamp(2.7rem,5vw,5rem);font-style:italic;font-weight:900;letter-spacing:-.04em;line-height:.92;text-transform:uppercase}.catalog-hero__copy{max-width:64ch;margin:0;color:var(--muted);font-size:clamp(1rem,1.5vw,1.22rem);line-height:1.6}.catalog-rollup{margin-top:2.5rem;padding:1.3rem 0 0;border-top:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:2rem}.catalog-rollup__value{margin:.35rem 0 0;font-size:1.05rem;font-weight:700}.catalog-rollup__note{max-width:58ch;margin:0;color:var(--muted);line-height:1.55}.catalog-list{border-top:1px solid var(--border)}.catalog-entry{border-bottom:1px solid var(--border)}.catalog-entry__main{position:relative;display:flex;align-items:stretch;gap:clamp(2rem,5vw,5rem);padding:2.5rem clamp(1.5rem,4vw,4.5rem);text-decoration:none;transition:background 140ms ease}.catalog-entry__main:hover{background:var(--raised)}.catalog-entry__main:focus-visible{outline:3px solid var(--blue);outline-offset:-3px}.catalog-entry__identity{flex:1 1 38%;min-width:18rem}.catalog-entry__title{margin:.55rem 0 .7rem;font-size:clamp(1.35rem,2vw,2rem);line-height:1.1}.catalog-entry__prompt{max-width:58ch;margin:0;color:var(--muted);font-size:.97rem;line-height:1.55}.catalog-entry__facts{flex:1 1 50%;display:flex;align-items:flex-start;gap:clamp(1.25rem,3vw,3rem)}.catalog-fact{flex:1 1 0;min-width:7rem}.catalog-fact__value{display:block;margin:.55rem 0 .35rem;font-size:.98rem;line-height:1.3}.catalog-fact__value--accent{color:var(--lime)}.catalog-fact__detail{display:block;overflow-wrap:anywhere;color:var(--dim);font-family:var(--mono);font-size:.65rem;line-height:1.5}.catalog-entry__open{position:absolute;right:clamp(1.5rem,4vw,4.5rem);bottom:1rem;color:var(--lime);font-family:var(--mono);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase}.catalog-entry__attempt{display:flex;justify-content:space-between;gap:1.5rem;padding:.75rem clamp(1.5rem,4vw,4.5rem);background:rgba(255,109,94,.12);color:#ffc1ba;text-decoration:none;font-family:var(--mono);font-size:.68rem;line-height:1.5}.catalog-entry__attempt:hover{text-decoration:underline}.catalog-empty{padding:5rem clamp(1.5rem,4vw,4.5rem);color:var(--muted)}.catalog-footer{display:flex;justify-content:space-between;gap:2rem;padding:1.5rem clamp(1.5rem,4vw,4.5rem);color:var(--dim);font-family:var(--mono);font-size:.67rem;line-height:1.5}.catalog-footer p{margin:0}.catalog-footer a{color:var(--lime)}
  @media(max-width:70rem){.catalog-entry__main{display:block}.catalog-entry__identity{min-width:0}.catalog-entry__facts{margin-top:2rem}.catalog-entry__open{position:static;display:block;margin-top:1.5rem}.catalog-rollup{display:block}.catalog-rollup__note{margin-top:1rem}}
  @media(max-width:46rem){:root{--frame:100vw}.catalog-header__inner{min-height:4.5rem;padding:0 1rem}.catalog-header__meta{display:none}.catalog-main{margin-bottom:0}.catalog-hero{padding:2.75rem 1.25rem}.catalog-hero__title{font-size:clamp(2.25rem,12vw,3.35rem)}.catalog-entry__main{padding:2rem 1.25rem}.catalog-entry__facts{flex-wrap:wrap;gap:1.5rem}.catalog-fact{flex:1 1 calc(50% - 1.5rem)}.catalog-entry__attempt{display:block;padding:.8rem 1.25rem}.catalog-entry__attempt span{display:block}.catalog-footer{display:block;padding:1.5rem 1.25rem}.catalog-footer p+p{margin-top:.65rem}}
  @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
`;

export function renderBenchmarkCatalogHtml(entries) {
  const sortedEntries = [...entries].sort((left, right) => left.benchmarkId.localeCompare(right.benchmarkId));
  const completeCount = sortedEntries.filter((entry) => entry.featuredStatus === "complete").length;
  const attentionCount = sortedEntries.filter((entry) => entry.latestAttempt).length;
  const rows = sortedEntries.length > 0
    ? sortedEntries.map(renderPromptEntry).join("\n")
    : '<p class="catalog-empty">No benchmark runs have been recorded yet.</p>';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>All prompts · Vasir benchmarks</title>
  <style>${renderEmbeddedFontStyles()}\n${CATALOG_STYLES}</style>
</head>
<body>
  <header class="catalog-header">
    <div class="catalog-header__inner">
      <a class="catalog-brand" href="./index.html">Vasir <span>Benchmark lab</span></a>
      <span class="catalog-header__meta">Local evidence · ${escapeHtml(sortedEntries.length)} prompt${sortedEntries.length === 1 ? "" : "s"}</span>
    </div>
  </header>
  <main class="catalog-main">
    <section class="catalog-hero" aria-labelledby="catalog-title">
      <span class="catalog-kicker">All benchmark prompts · ${escapeHtml(completeCount)} complete${attentionCount ? ` · ${escapeHtml(attentionCount)} need attention` : ""}</span>
      <h1 class="catalog-hero__title" id="catalog-title">One lab. Many prompts.</h1>
      <p class="catalog-hero__copy">Open the exact evidence for each task. Every prompt keeps its own rubric, model matrix, judges, answers, and score basis.</p>
      <div class="catalog-rollup">
        <div>
          <span class="catalog-rollup__label">Cross-prompt result</span>
          <p class="catalog-rollup__value">No overall score yet.</p>
        </div>
        <p class="catalog-rollup__note">Prompt-local scores are not averaged. A future rollup will require a versioned capability taxonomy, calibrated prompt mappings, explicit weights, compatible source runs, and visible missing evidence.</p>
      </div>
    </section>
    <section class="catalog-list" aria-label="Benchmark prompts">${rows}</section>
    <footer class="catalog-footer">
      <p>Generated from authoritative local <code>run.json</code> artifacts.</p>
      <p>Reports are measurements, not universal proof.</p>
    </footer>
  </main>
</body>
</html>`;
}

export function writeBenchmarkCatalog({
  historyRootDirectory,
  outputFilePath = path.join(historyRootDirectory, "index.html")
}) {
  const records = readBenchmarkCatalogRunRecords({ historyRootDirectory });
  const entries = selectBenchmarkCatalogRuns(records).map(normalizeBenchmarkCatalogEntry);
  const resolvedOutputFilePath = path.resolve(outputFilePath);
  fs.mkdirSync(path.dirname(resolvedOutputFilePath), { recursive: true });
  fs.writeFileSync(resolvedOutputFilePath, renderBenchmarkCatalogHtml(entries), "utf8");
  return resolvedOutputFilePath;
}
