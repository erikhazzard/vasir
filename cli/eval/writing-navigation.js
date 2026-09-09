import fs from 'node:fs';
import vm from 'node:vm';

// Navigation is a presentation summary, not a new scoring implementation.
// Run the same isolated pure functions that render the Writing leaderboard.
// Only this tiny result joins the landing bundle; the full evidence stays lazy.
export function buildWritingNavigationSummary(collection, applicationSource = fs.readFileSync(new URL('../../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8')) {
  return evaluateWritingPresentation(collection, 'buildWritingNavigationSummary(collection)', applicationSource);
}

export function buildWritingCategoryCollection(collection, applicationSource = fs.readFileSync(new URL('../../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8')) {
  return evaluateWritingPresentation(collection, "buildWritingCategoryCollection(collection, 'all-writing')", applicationSource);
}

function evaluateWritingPresentation(collection, expression, applicationSource) {
  const boundary = applicationSource.indexOf('(async function () {');
  if (boundary <= 0) throw new Error('Writing navigation requires the isolated presentation functions.');
  const context = vm.createContext({ collection });
  vm.runInContext(applicationSource.slice(0, boundary), context, { timeout: 1000 });
  const summary = vm.runInContext(expression, context, { timeout: 1000 });
  return JSON.parse(JSON.stringify(summary));
}
