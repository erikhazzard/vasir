import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadGamesRehearsalSiteFiles } from "../site/vasirbenchmark.com/games-browsercheck.mjs";

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../site/vasirbenchmark.com");
const PUBLIC_FILES = JSON.parse(fs.readFileSync(path.join(SITE_ROOT, "deployment.json"))).publicFiles;
const WRITING_PATHS = ["writing-data.js", "writing-responses.js", "writing-creation-responses.js"];
const RELEASE_ID = "a".repeat(64);
const ORIGIN = "https://vasirbenchmark.com";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

function setup(t, { immutable = true, fullManifest = true } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-games-manifest-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const siteFiles = PUBLIC_FILES.filter(file => fullManifest || !WRITING_PATHS.includes(file.path)).map(file => {
    let sourcePath = path.join(SITE_ROOT, file.path);
    let contents = fs.readFileSync(sourcePath);
    if (immutable && file.path.endsWith(".html")) {
      let html = contents.toString("utf8");
      for (const dependency of PUBLIC_FILES.filter(entry => !entry.path.endsWith(".html"))) {
        html = html.replaceAll(`./${dependency.path}`, `/releases/${RELEASE_ID}/${dependency.path}`);
      }
      contents = Buffer.from(html);
      sourcePath = path.join(directory, file.path);
      fs.writeFileSync(sourcePath, contents);
    }
    return { path: file.path, sourcePath, contentType: file.contentType, bytes: contents.length, sha256: hash(contents) };
  });
  return { siteFiles, manifestPath: path.join(directory, "local-artifacts.json") };
}

test("Games rehearsal maps the full immutable manifest to its verified 13-file scope", t => {
  const fixture = setup(t);
  // Writing has its own browser proof; this adapter must not load or claim its bundles.
  for (const file of fixture.siteFiles.filter(entry => WRITING_PATHS.includes(entry.path))) file.sourcePath = "/not-read-by-games";
  const result = loadGamesRehearsalSiteFiles({ ...fixture, releaseId: RELEASE_ID });
  assert.equal(result.files.size, 13);
  assert.equal(result.scope.declaredSiteFileCount, 16);
  assert.equal(result.scope.verifiedSiteFiles.length, 13);
  assert.deepEqual(result.scope.ignoredSiteFiles, WRITING_PATHS);
  assert.equal(result.scope.mapping, "immutable-release");
  assert.equal(result.scope.releaseId, RELEASE_ID);
  assert.equal(result.dataFile.path, "data.js");
  for (const file of fixture.siteFiles.filter(entry => !WRITING_PATHS.includes(entry.path))) {
    const requestUrl = `${ORIGIN}/${file.path.endsWith(".html") ? "" : `releases/${RELEASE_ID}/`}${file.path}`;
    const actual = result.files.get(requestUrl);
    assert.ok(actual, `Missing mapped URL: ${requestUrl}`);
    assert.equal(actual.body.length, file.bytes);
    assert.equal(hash(actual.body), file.sha256);
    assert.equal(actual.isArtifact, false);
    if (!file.path.endsWith(".html")) assert.equal(result.files.has(`${ORIGIN}/${file.path}`), false);
  }
  assert.equal(result.files.has(`${ORIGIN}/releases/${RELEASE_ID}/writing-data.js`), false);
  assert.equal(result.files.has(`${ORIGIN}/releases/${RELEASE_ID}/writing-responses.js`), false);
});

test("Games rehearsal infers the release ID from hash-verified HTML for either manifest size", t => {
  for (const fullManifest of [false, true]) {
    const result = loadGamesRehearsalSiteFiles(setup(t, { fullManifest }));
    assert.equal(result.scope.releaseId, RELEASE_ID);
    assert.ok(result.files.has(`${ORIGIN}/releases/${RELEASE_ID}/games.js`));
    assert.equal(result.files.has(`${ORIGIN}/games.js`), false);
  }
});

test("Games rehearsal preserves legacy 13-file apex manifests", t => {
  const result = loadGamesRehearsalSiteFiles(setup(t, { immutable: false, fullManifest: false }));
  assert.equal(result.scope.mapping, "legacy-apex");
  assert.equal(result.scope.releaseId, null);
  assert.deepEqual(result.scope.ignoredSiteFiles, []);
  assert.ok(result.files.has(`${ORIGIN}/games.html`));
  assert.ok(result.files.has(`${ORIGIN}/games.js`));
  assert.ok(result.files.has(`${ORIGIN}/data.js`));
});

test("Games rehearsal still requires every original Games-scoped file", t => {
  const fixture = setup(t);
  for (const file of fixture.siteFiles.filter(entry => !WRITING_PATHS.includes(entry.path))) {
    assert.throws(() => loadGamesRehearsalSiteFiles({ ...fixture, siteFiles: fixture.siteFiles.filter(entry => entry.path !== file.path) }), /Missing required Games site file/);
  }
});

test("Games rehearsal rejects unknown, duplicate, traversal, and incomplete extension paths", t => {
  const fixture = setup(t);
  for (const extraPath of ["extra.js", "../games.js", "/games.js", "games.js", "writing-data.js"]) {
    assert.throws(() => loadGamesRehearsalSiteFiles({ ...fixture, siteFiles: [...fixture.siteFiles, { path: extraPath }] }), /Unexpected site file|Invalid site-file path|Duplicate site file/);
  }
  assert.throws(() => loadGamesRehearsalSiteFiles({ ...fixture, siteFiles: fixture.siteFiles.filter(file => file.path !== "writing-data.js") }), /both Writing bundles or neither/);
  assert.throws(() => loadGamesRehearsalSiteFiles({ ...fixture, siteFiles: null }), /site-file manifest/);
});

test("Games rehearsal rejects changed bytes, changed hashes, and missing required metadata", t => {
  const fixture = setup(t);
  const original = fixture.siteFiles.find(file => file.path === "games.js");
  const altered = changes => ({ ...fixture, siteFiles: fixture.siteFiles.map(file => file.path === original.path ? { ...file, ...changes } : file) });
  assert.throws(() => loadGamesRehearsalSiteFiles(altered({ bytes: original.bytes + 1 })), /Local file length changed: games.js/);
  assert.throws(() => loadGamesRehearsalSiteFiles(altered({ sha256: "0".repeat(64) })), /Local file hash changed: games.js/);
  assert.throws(() => loadGamesRehearsalSiteFiles(altered({ sourcePath: "" })), /Missing source path or content type/);
  assert.throws(() => loadGamesRehearsalSiteFiles(altered({ contentType: "" })), /Missing source path or content type/);
});

test("Games rehearsal rejects mismatched, malformed, and mixed immutable release identities", t => {
  const fixture = setup(t);
  assert.throws(() => loadGamesRehearsalSiteFiles({ ...fixture, releaseId: "b".repeat(64) }), /release ID differs/);
  assert.throws(() => loadGamesRehearsalSiteFiles({ ...fixture, releaseId: "latest" }), /Invalid declared immutable release ID/);
  assert.throws(() => loadGamesRehearsalSiteFiles({ ...setup(t, { immutable: false }), releaseId: RELEASE_ID }), /release ID differs/);
  const htmlFile = fixture.siteFiles.find(file => file.path === "games.html");
  const original = fs.readFileSync(htmlFile.sourcePath, "utf8");
  for (const replacement of ["b".repeat(64), "latest"]) {
    const contents = Buffer.from(original.replaceAll(RELEASE_ID, replacement));
    fs.writeFileSync(htmlFile.sourcePath, contents);
    htmlFile.bytes = contents.length;
    htmlFile.sha256 = hash(contents);
    assert.throws(() => loadGamesRehearsalSiteFiles(fixture), /multiple immutable releases|Invalid immutable release ID in candidate HTML/);
  }
});
