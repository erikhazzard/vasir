import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("the shared report disclosure cannot starve the comparison text of grid width", () => {
  const css = fs.readFileSync(new URL("../site/vasirbenchmark.com/benchmark-report.css", import.meta.url), "utf8");
  const rule = css.match(/^\.evidence-truth\s*\{([^}]+)\}/mu);
  assert.ok(rule, "Every report uses the shared disclosure grid without a benchmark-only prefix.");
  assert.match(rule[1], /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto\s*;/u);
  assert.doesNotMatch(rule[1], /overflow(?:-x)?:\s*(?:hidden|clip)|text-overflow:\s*ellipsis/u);
  const mobileOffset = css.indexOf('@media (max-width: 46rem)');
  assert.ok(mobileOffset > rule.index, "The existing mobile single-column rule continues to win.");
  assert.match(css.slice(mobileOffset), /\.evidence-truth\s*\{[^}]*grid-template-columns:\s*1fr\s*;/u);
});

test("creation evidence grids wrap long SHA labels without clipping original text or changing peer layouts", () => {
  const css = fs.readFileSync(new URL("../site/vasirbenchmark.com/benchmark-report.css", import.meta.url), "utf8");
  const rule = css.match(/\[data-creation-evidence-body\],\s*\[data-creation-prompt-body\]\s*\{([^}]+)\}/u)?.[1];
  assert.ok(rule, "Wrapping is scoped to the new creation evidence bodies.");
  assert.match(rule, /min-width:\s*0\s*;/u);
  assert.match(rule, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/u);
  assert.match(rule, /overflow-wrap:\s*anywhere\s*;/u);
  assert.doesNotMatch(rule, /overflow(?:-x)?:\s*(?:hidden|clip)|text-overflow:\s*ellipsis|display:\s*none/u);
  assert.match(css, /\.model-run__text\s*\{[^}]*white-space:\s*pre-wrap\s*;/u);
});

test("all mobile Writing dimension and rating columns retain readable words while evidence can wrap", () => {
  const css = fs.readFileSync(new URL("../site/vasirbenchmark.com/benchmark-report.css", import.meta.url), "utf8");
  const mobile = css.slice(css.indexOf('@media (max-width: 42rem)'));
  const selector = '.writing-dimensions :is(th, td)';
  for (const [column, width] of [[':first-child', '6rem'], [':nth-child(2)', '4rem']]) {
    const offset = mobile.indexOf(selector + column);
    assert.ok(offset >= 0, `${column} uses the shared Writing mobile table rule.`);
    assert.equal(mobile.slice(mobile.lastIndexOf('\n', offset), offset).trim(), '', 'No benchmark-only prefix can exclude a Writing report.');
    const rule = mobile.slice(offset, mobile.indexOf('}', offset));
    assert.ok(rule.includes(`min-width: ${width};`));
    assert.match(rule, /overflow-wrap:\s*normal\s*;/u);
    assert.doesNotMatch(rule, /overflow:\s*(?:hidden|clip)|text-overflow:\s*ellipsis/u);
  }
  assert.match(mobile, /\.writing-dimensions td\s*\{[^}]*overflow-wrap:\s*anywhere\s*;/u);
  assert.ok(!mobile.includes(selector + ':nth-child(3)'), 'Evidence retains the existing wrapping rule.');
});
