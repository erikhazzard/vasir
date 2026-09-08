import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(repo, "site/vasirbenchmark.com");
const releaseId = "a".repeat(64);
const config = JSON.parse(fs.readFileSync(path.join(site, "deployment.json"), "utf8"));
const template = fs.readFileSync(path.join(site, "infra/production.yml"), "utf8");
const routerBlock = template.split("  ReleaseRouterFunction:\n")[1]?.split("      FunctionConfig:")[0];
const source = routerBlock?.split("      FunctionCode: !Sub |\n")[1];
assert.ok(source, "Read the actual CloudFormation release router, not a test replica.");
const context = vm.createContext({});
vm.runInContext(source.replaceAll("${ActiveReleaseId}", releaseId), context);
const route = uri => context.handler({ request: { uri } });

test("production release router serves every declared public file, including lazy Writing evidence", () => {
  assert.equal(config.publicFiles.length, 15);
  for (const file of config.publicFiles) {
    const uri = `/releases/${releaseId}/${file.path}`;
    assert.equal(route(uri).uri, uri, `The CDN would reject ${file.path}`);
  }
});

test("stable HTML entrypoints route to the active immutable release", () => {
  for (const [uri, file] of [["/", "index.html"], ["/index.html", "index.html"], ["/benchmark-report.html", "benchmark-report.html"], ["/games.html", "games.html"]]) {
    assert.equal(route(uri).uri, `/releases/${releaseId}/${file}`);
  }
});

test("production release router rejects unlisted files, apex script aliases, and traversal", () => {
  for (const uri of [
    "/writing-data.js", "/writing-responses.js", "/app.js",
    `/releases/${releaseId}/writing-private.js`, `/releases/${releaseId}/run.json`,
    `/releases/${releaseId}/../data.js`, `/releases/${releaseId}/%2e%2e/data.js`,
    `/releases/${releaseId}/writing-data.js/extra`, `/releases/${releaseId}/writing-data.js.map`,
    "/releases/not-a-release/writing-data.js", `/artifacts/${releaseId}/index.html`
  ]) {
    assert.equal(route(uri).statusCode, 403, `Unexpectedly public: ${uri}`);
  }
});

test("Games navigation links to the available Writing capability", () => {
  const html = fs.readFileSync(path.join(site, "games.html"), "utf8");
  assert.match(html, /<a class="game-capabilities__link" href="\.\/index\.html#capabilities\/writing\/storytelling">Writing<\/a>/);
  assert.doesNotMatch(html, /game-capabilities__unavailable[^>]*>Writing/);
});
