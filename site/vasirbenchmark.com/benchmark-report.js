(function () {
  'use strict';

  const data = window.VASIR_DATA;
  const reportView = document.getElementById('report-view');
  const reportPage = document.getElementById('report-page');
  const routeSections = new Set(['overview', 'ranking', 'method', 'top']);
  const returnFieldId = new URLSearchParams(window.location.search).get('from') === 'overall'
    ? 'overall'
    : null;
  let activeBenchmarkId = null;

  if (!data || !reportView || !reportPage) return;

  const benchmarkById = new Map(data.benchmarks.map((benchmark) => [benchmark.id, benchmark]));
  const summaryById = new Map(data.benchmarkSummaries.map((summary) => [summary.benchmarkId, summary]));
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));
  const settingById = new Map(data.settings.map((setting) => [setting.id, setting]));

  const escapeHTML = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const signed = (value) => `${value > 0 ? '+' : ''}${Number(value).toFixed(1)}`;
  const parseRoute = () => {
    const [benchmarkId, candidateSection] = decodeURIComponent(window.location.hash.slice(1)).split('/');
    return {
      benchmarkId,
      section: routeSections.has(candidateSection) ? candidateSection : null
    };
  };
  const categoryBenchmarks = (categoryId) => data.benchmarks.filter((benchmark) => benchmark.category === categoryId);

  const hydrateSectionLinks = (benchmarkId) => {
    document.querySelectorAll('[data-report-section]').forEach((link) => {
      link.href = `#${benchmarkId}/${link.dataset.reportSection}`;
    });
  };

  const scrollToSection = (section) => {
    window.requestAnimationFrame(() => {
      if (section === 'top') {
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      document.getElementById(section)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  };

  const modelPreviewRows = (benchmark) => {
    const baselineRows = data.benchmarkResults.filter((result) => (
      result.benchmarkId === benchmark.id && result.condition === 'baseline'
    ));
    const treatmentRows = data.benchmarkResults.filter((result) => (
      result.benchmarkId === benchmark.id && result.condition === 'full'
    ));

    return treatmentRows.map((treatment) => {
      const baseline = baselineRows.find((candidate) => candidate.settingId === treatment.settingId);
      const setting = settingById.get(treatment.settingId);
      return {
        setting,
        baseline: baseline.score,
        treatment: treatment.score,
        delta: Math.round((treatment.score - baseline.score) * 10) / 10
      };
    }).sort((a, b) => b.treatment - a.treatment || b.baseline - a.baseline).slice(0, 5);
  };

  const truthMarkup = (benchmark, summary) => {
    if (benchmark.evidenceKind === 'development') {
      return `
        <aside class="evidence-truth" aria-label="Evidence status">
          <strong class="evidence-truth__kind">Development evidence</strong>
          <p>Calibration pending · treatment is the <strong>Architecture skill</strong>, not Full Vasir.</p>
          <a href="${escapeHTML(summary.sourceHref)}">Open source report →</a>
        </aside>
      `;
    }

    return `
      <aside class="evidence-truth evidence-truth--illustrative" aria-label="Evidence status">
        <strong class="evidence-truth__kind">Illustrative design fixture</strong>
        <p>No run.json, judge artifacts, or source judgments exist for this aspirational test yet.</p>
        <span aria-hidden="true"></span>
      </aside>
    `;
  };

  const heroMarkup = (benchmark, summary) => {
    const record = `${summary.wins}W · ${summary.ties}T · ${summary.losses}L`;
    const regressionClass = summary.delta < 0 ? ' is-regression' : '';
    return `
      <section class="evidence-hero" id="overview" aria-labelledby="report-title">
        <div class="evidence-hero__identity">
          <p class="evidence-hero__eyebrow">${escapeHTML(benchmark.suite)} · benchmark evidence</p>
          <h1 id="report-title">${escapeHTML(benchmark.name)}</h1>
          <p class="evidence-hero__description">${escapeHTML(benchmark.description)}</p>
          <p class="evidence-hero__prompt"><span>Prompt under test</span>${escapeHTML(benchmark.prompt)}</p>
        </div>

        <div class="evidence-hero__result" aria-label="Matched condition result">
          <div class="matched-result">
            <dl class="matched-result__condition matched-result__condition--baseline">
              <dt>${escapeHTML(summary.baselineLabel)}</dt>
              <dd><strong>${summary.baseline.toFixed(1)}</strong><small>benchmark score / 100</small></dd>
            </dl>
            <span class="matched-result__arrow" aria-hidden="true">→</span>
            <dl class="matched-result__condition matched-result__condition--treatment">
              <dt>${escapeHTML(summary.treatmentLabel)}</dt>
              <dd><strong>${summary.treatment.toFixed(1)}</strong><small>benchmark score / 100</small></dd>
            </dl>
          </div>
          <dl class="matched-result__delta${regressionClass}">
            <dt>Matched change</dt>
            <dd>${signed(summary.delta)} pts</dd>
          </dl>
          <dl class="evidence-facts">
            <div><dt>Completion</dt><dd>${summary.complete}/${summary.total} ${escapeHTML(summary.completionLabel)}</dd></div>
            <div><dt>Matched record</dt><dd>${record}</dd></div>
            <div><dt>Calibration</dt><dd>${escapeHTML(summary.calibration)}</dd></div>
          </dl>
        </div>
      </section>
    `;
  };

  const overviewMarkup = (benchmark, summary) => {
    const sourceMarkup = benchmark.evidenceKind === 'development'
      ? `
        <h3>Inspect every answer and judgment</h3>
        <p>The source artifact contains the real prompt, response matrix, judge decisions, and method behind the summary above.</p>
        <a href="${escapeHTML(summary.sourceHref)}">Open full evidence report →</a>
      `
      : `
        <h3>Evidence not collected yet</h3>
        <p class="report-overview__fixture">This benchmark is mock data used to lock the product shape. Its scores must not be cited as model performance.</p>
      `;

    return `
      <section class="report-section" aria-labelledby="intent-title">
        <header class="report-section__heading">
          <div>
            <p class="ui-eyebrow">Test definition</p>
            <h2 id="intent-title">What this benchmark tests</h2>
          </div>
          <p>${escapeHTML(benchmark.suite)} is one track inside the ${escapeHTML(categoryById.get(benchmark.category).name)} capability.</p>
        </header>
        <div class="report-overview">
          <section class="report-overview__intent">
            <h3>Decision boundary</h3>
            <p>${escapeHTML(benchmark.description)} The result stays local to this prompt and track; it is not a claim about every ${escapeHTML(categoryById.get(benchmark.category).name.toLowerCase())} task.</p>
          </section>
          <section class="report-overview__source">
            ${sourceMarkup}
          </section>
        </div>
      </section>
    `;
  };

  const modelRowMarkup = (row, index) => {
    const start = Math.min(row.baseline, row.treatment);
    const width = Math.abs(row.treatment - row.baseline);
    const regressionClass = row.delta < 0 ? ' is-regression' : '';
    return `
      <li class="model-preview__row${regressionClass}">
        <span class="model-preview__identity"><strong>#${index + 1} · ${escapeHTML(row.setting.family)}</strong><small>${escapeHTML(row.setting.reasoning)} reasoning</small></span>
        <span
          class="model-preview__plot"
          style="--preview-start:${start}%;--preview-width:${width}%;--preview-baseline:${row.baseline}%;--preview-treatment:${row.treatment}%"
          aria-label="Without ${row.baseline.toFixed(1)}, with ${row.treatment.toFixed(1)}"
        >
          <i class="model-preview__axis" aria-hidden="true"></i>
          <i class="model-preview__connector" aria-hidden="true"></i>
          <i class="model-preview__mark model-preview__mark--baseline" aria-hidden="true"></i>
          <i class="model-preview__mark model-preview__mark--treatment" aria-hidden="true"></i>
        </span>
        <span class="model-preview__score"><span>Without</span>${row.baseline.toFixed(1)}</span>
        <span class="model-preview__score model-preview__score--treatment"><span>With</span>${row.treatment.toFixed(1)}</span>
        <span class="model-preview__delta">${signed(row.delta)}</span>
      </li>
    `;
  };

  const rankingMarkup = (benchmark) => `
    <section class="report-section" id="ranking" aria-labelledby="ranking-title">
      <header class="report-section__heading">
        <div>
          <p class="ui-eyebrow">Illustrative model field · top 5</p>
          <h2 id="ranking-title">How the report will compare models</h2>
        </div>
        <p>These model-setting cells are mock data for the interface only. They are not the source evidence behind a measured summary.</p>
      </header>
      <details class="preview-disclosure" open>
        <summary>Show illustrative matched model rows</summary>
        <ol class="model-preview" aria-label="Illustrative model results preview">
          ${modelPreviewRows(benchmark).map(modelRowMarkup).join('')}
        </ol>
      </details>
    </section>
  `;

  const methodMarkup = (benchmark, summary) => {
    const measured = benchmark.evidenceKind === 'development';
    return `
      <section class="report-section" id="method" aria-labelledby="method-title">
        <header class="report-section__heading">
          <div>
            <p class="ui-eyebrow">Claim boundary</p>
            <h2 id="method-title">How to read this result</h2>
          </div>
          <p>${measured ? 'Development evidence is real; cross-benchmark calibration is not complete.' : 'Everything on this page is an explicitly marked product-design fixture.'}</p>
        </header>
        <div class="method-grid">
          <section>
            <h3>Matched conditions</h3>
            <p>${measured ? `The same prompt is judged under ${escapeHTML(summary.baselineLabel)} and ${escapeHTML(summary.treatmentLabel)}. This is not a Full Vasir comparison.` : `The fixture pairs ${escapeHTML(summary.baselineLabel)} and ${escapeHTML(summary.treatmentLabel)} across the same mock model settings.`}</p>
          </section>
          <section>
            <h3>Prompt-local score</h3>
            <p>The score and W/T/L record belong to this benchmark. Capability and overall rollups require compatible calibrated suites and explicit weights.</p>
          </section>
          <section>
            <h3>Evidence state</h3>
            <p>${measured ? `${escapeHTML(summary.calibration)}. Use the source report for answers, judgments, response matrix, and method.` : 'No run artifact or judgment record exists. Do not cite these values as observed model performance.'}</p>
          </section>
        </div>
      </section>
    `;
  };

  const paginationMarkup = (benchmark) => {
    const siblings = categoryBenchmarks(benchmark.category);
    const index = siblings.findIndex((candidate) => candidate.id === benchmark.id);
    const previous = siblings[(index - 1 + siblings.length) % siblings.length];
    const next = siblings[(index + 1) % siblings.length];
    return `
      <nav class="report-pagination" aria-label="Other ${escapeHTML(categoryById.get(benchmark.category).name)} benchmarks">
        <a class="report-pagination__link" href="#${escapeHTML(previous.id)}"><span>← Previous benchmark</span><strong>${escapeHTML(previous.name)}</strong></a>
        <a class="report-pagination__link" href="#${escapeHTML(next.id)}"><span>Next benchmark →</span><strong>${escapeHTML(next.name)}</strong></a>
      </nav>
    `;
  };

  const render = (benchmarkId, options = {}) => {
    const benchmark = benchmarkById.get(benchmarkId) || data.benchmarks[0];
    const summary = summaryById.get(benchmark.id);
    const category = categoryById.get(benchmark.category);
    const returnContext = returnFieldId === 'overall'
      ? { id: 'overall', name: 'Combined' }
      : category;
    const returnHref = `./index.html#capabilities/${returnContext.id}/benchmarks`;
    activeBenchmarkId = benchmark.id;

    reportPage.style.setProperty('--report-category', category.color);
    document.title = `${benchmark.name} · VasirBench`;

    reportView.innerHTML = `
      <div class="report-shell">
        <div class="report-context">
          <nav class="report-breadcrumb" aria-label="Benchmark hierarchy">
            <a href="./index.html">VasirBench</a>
            <span class="report-breadcrumb__separator" aria-hidden="true">→</span>
            <a href="${escapeHTML(returnHref)}">${escapeHTML(returnContext.name)}</a>
            <span class="report-breadcrumb__separator" aria-hidden="true">→</span>
            <span>${escapeHTML(benchmark.suite)}</span>
            <span class="report-breadcrumb__separator" aria-hidden="true">→</span>
            <span class="report-breadcrumb__current" aria-current="page">${escapeHTML(benchmark.name)}</span>
          </nav>
          <a class="report-context__back" href="${escapeHTML(returnHref)}">
            <span class="report-context__back-long">← All ${escapeHTML(returnContext.name)} tests</span>
            <span class="report-context__back-short">← ${escapeHTML(benchmark.suite)}</span>
          </a>
        </div>
        ${truthMarkup(benchmark, summary)}
        ${heroMarkup(benchmark, summary)}
        ${overviewMarkup(benchmark, summary)}
        ${rankingMarkup(benchmark)}
        ${methodMarkup(benchmark, summary)}
        ${paginationMarkup(benchmark)}
      </div>
    `;

    if (!benchmarkById.has(benchmarkId)) {
      window.history.replaceState(null, '', `#${benchmark.id}`);
    }
    hydrateSectionLinks(benchmark.id);
    if (options.scroll) scrollToSection(options.section || 'top');
  };

  window.addEventListener('hashchange', () => {
    const route = parseRoute();
    if (route.benchmarkId === activeBenchmarkId && benchmarkById.has(route.benchmarkId)) {
      scrollToSection(route.section || 'top');
      return;
    }
    render(route.benchmarkId, { scroll: true, section: route.section });
  });

  const initialRoute = parseRoute();
  render(initialRoute.benchmarkId, { scroll: Boolean(initialRoute.section), section: initialRoute.section });
}());
