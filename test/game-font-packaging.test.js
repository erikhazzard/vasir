import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { captureGoogleFontDependencies, vendorGoogleFonts } from '../benchmarks/2d-jumping-demo/vendor-google-fonts.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const stylesheetUrl = 'https://fonts.googleapis.com/css2?family=Example&display=swap';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'font-packaging-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const directory of ['source', 'package', 'dependencies']) fs.mkdirSync(path.join(root, directory));
  const html = `<!doctype html><link rel="preconnect" href="https://fonts.gstatic.com"><link href="${stylesheetUrl.replaceAll('&', '&amp;')}" rel="stylesheet"><script>window.fixture = "unchanged";</script>`;
  for (const directory of ['source', 'package']) fs.writeFileSync(path.join(root, directory, 'index.html'), html);
  const css = '@font-face { font-family: "Example"; font-weight: 500; src: url(https://fonts.gstatic.com/s/example/v1/a.woff2) format("woff2"); unicode-range: U+0-FF; }';
  const pin = (name, bytes) => { fs.writeFileSync(path.join(root, 'dependencies', name), bytes); return { path: name, bytes: Buffer.byteLength(bytes), sha256: hash(bytes) }; };
  const manifest = { kind: 'vasir-game-font-dependencies', schemaVersion: 1, inputArtifactHash: hash(html), stylesheet: { url: stylesheetUrl, ...pin('font.css', css) }, fonts: [{ url: 'https://fonts.gstatic.com/s/example/v1/a.woff2', ...pin('font.woff2', 'wOF2 explicit synthetic bytes') }], license: pin('license.txt', 'Explicit synthetic license fixture <notice>') };
  const dependencyManifestPath = path.join(root, 'dependencies/manifest.json'); fs.writeFileSync(dependencyManifestPath, JSON.stringify(manifest));
  const settings = { packageRoot: path.join(root, 'package'), frozenSourceRoot: path.join(root, 'source'), inputArtifactHash: hash(html), dependencyManifestPath };
  return { root, html, css, manifest, settings };
}

test('Font packaging changes only transport URLs and retains exact font bytes and source', async t => {
  const { root, html, css, manifest, settings } = fixture(t);
  const receipt = await vendorGoogleFonts(settings);
  assert.equal(fs.readFileSync(path.join(root, 'source/index.html'), 'utf8'), html);
  assert.equal(receipt.inputArtifactHash, hash(html));
  assert.equal(receipt.originalEntrypoint.sha256, hash(html));
  assert.equal(receipt.sourceEdited, false);
  const font = receipt.additions.find(file => file.path.endsWith('.woff2'));
  assert.equal(font.sha256, manifest.fonts[0].sha256);
  assert.equal(hash(fs.readFileSync(path.join(root, 'package', font.path))), manifest.fonts[0].sha256);
  const relocatedCss = receipt.additions.find(file => file.path.endsWith('.css'));
  assert.equal(fs.readFileSync(path.join(root, 'package', relocatedCss.path), 'utf8'), css.replaceAll(manifest.fonts[0].url, `${font.sha256}.woff2`));
  assert.equal(fs.readFileSync(path.join(root, 'package/index.html'), 'utf8'), html.replace('https://fonts.gstatic.com', './').replace(stylesheetUrl.replaceAll('&', '&amp;'), relocatedCss.path));
  const license = receipt.additions.find(file => file.path.endsWith('LICENSE.html'));
  assert.match(fs.readFileSync(path.join(root, 'package', license.path), 'utf8'), /&lt;notice&gt;/);
});

test('Wrong source identity, changed dependency bytes and frozen-source targets fail before edits', async t => {
  for (const mutation of ['identity', 'bytes', 'target']) {
    const { root, html, settings } = fixture(t);
    if (mutation === 'identity') settings.inputArtifactHash = 'a'.repeat(64);
    if (mutation === 'bytes') fs.writeFileSync(path.join(root, 'dependencies/font.woff2'), 'changed');
    if (mutation === 'target') settings.packageRoot = settings.frozenSourceRoot;
    await assert.rejects(() => vendorGoogleFonts(settings), /submitted artifact|pin changed|frozen submission/);
    assert.equal(fs.readFileSync(path.join(root, 'source/index.html'), 'utf8'), html);
    assert.equal(fs.readFileSync(path.join(root, 'package/index.html'), 'utf8'), html);
  }
});

function importedFixture(t, importValue = url => `"${url}"`) {
  const base = fixture(t);
  const families = ['Archivo Black', 'DM Mono', 'Space Grotesk'];
  const url = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap';
  const pin = (name, bytes) => { fs.writeFileSync(path.join(base.root, 'dependencies', name), bytes); return { path: name, bytes: Buffer.byteLength(bytes), sha256: hash(bytes) }; };
  const fonts = families.map((_, index) => ({ url: `https://fonts.gstatic.com/s/example/v1/${index}.woff2`, ...pin(`font-${index}.woff2`, `wOF2 synthetic family ${index}`) }));
  const upstream = families.map((family, index) => `@font-face {font-family:'${family}';font-style:normal;font-weight:400 700;font-display:swap;src:url(${fonts[index].url}) format('woff2');unicode-range:U+0-FF;}`).join('\n');
  const licenses = families.map((family, index) => ({ family, url: `https://raw.githubusercontent.com/google/fonts/main/ofl/example${index}/OFL.txt`, ...pin(`license-${index}.txt`, `Copyright synthetic ${family} <authors>\nSIL OPEN FONT LICENSE\nExact test notice ${index}.\n`) }));
  const manifest = { kind: 'vasir-game-font-dependencies', schemaVersion: 2, inputArtifactHash: base.settings.inputArtifactHash, stylesheet: { url, ...pin('font.css', upstream) }, fonts, licenses };
  const html = '<!doctype html><link rel="stylesheet" crossorigin href="./assets/main.css"><script src="game.js"></script>';
  const css = `/* @import "${url}"; intentionally inert */\n@import${importValue(url)} layer(fonts) screen;\n.game{color:red;--text:'@import "${url}"';background:url(./sprite.png)}`;
  for (const name of ['source', 'package']) {
    fs.mkdirSync(path.join(base.root, name, 'assets'));
    fs.writeFileSync(path.join(base.root, name, 'index.html'), html);
    fs.writeFileSync(path.join(base.root, name, 'assets/main.css'), css);
    fs.writeFileSync(path.join(base.root, name, 'game.js'), 'window.syntheticGame = "untouched";');
  }
  fs.writeFileSync(base.settings.dependencyManifestPath, JSON.stringify(manifest));
  return { ...base, html, css, upstream, manifest, url };
}

test('CSS imports relocate only their exact URL, preserving descriptor rules, licenses and game bytes', async t => {
  for (const importValue of [url => `"${url}"`, url => ` '${url}'`, url => ` url( "${url}" )`]) {
    const { root, html, css, upstream, manifest, settings, url } = importedFixture(t, importValue);
    const receipt = await vendorGoogleFonts(settings);
    const dependencyCss = receipt.additions.find(file => file.path.endsWith('/font.css'));
    const replacement = `../${dependencyCss.path}`;
    const expected = css.replace(`@import${importValue(url)}`, `@import${importValue(replacement)}`);
    assert.equal(fs.readFileSync(path.join(root, 'package/assets/main.css'), 'utf8'), expected);
    assert.equal(fs.readFileSync(path.join(root, 'source/assets/main.css'), 'utf8'), css);
    assert.equal(fs.readFileSync(path.join(root, 'package/index.html'), 'utf8'), html);
    assert.equal(fs.readFileSync(path.join(root, 'package/game.js'), 'utf8'), fs.readFileSync(path.join(root, 'source/game.js'), 'utf8'));
    assert.deepEqual(receipt.rewrittenStylesheets, [{ original: { path: 'assets/main.css', bytes: Buffer.byteLength(css), sha256: hash(css) }, packaged: { path: 'assets/main.css', bytes: Buffer.byteLength(expected), sha256: hash(expected) } }]);
    let expectedUpstream = upstream;
    for (const font of manifest.fonts) {
      expectedUpstream = expectedUpstream.replaceAll(font.url, `${font.sha256}.woff2`);
      const published = receipt.additions.find(file => file.sha256 === font.sha256);
      assert.deepEqual(fs.readFileSync(path.join(root, 'package', published.path)), fs.readFileSync(path.join(root, 'dependencies', font.path)));
    }
    assert.equal(fs.readFileSync(path.join(root, 'package', dependencyCss.path), 'utf8'), expectedUpstream);
    const notices = fs.readFileSync(path.join(root, 'package', receipt.additions.find(file => file.path.endsWith('LICENSE.html')).path), 'utf8');
    for (const license of manifest.licenses) {
      const original = fs.readFileSync(path.join(root, 'dependencies', license.path), 'utf8').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      assert.ok(notices.includes(`<h2>${license.family}</h2><pre>${original}</pre>`));
    }
  }
});

test('Missing, duplicate or corrupt family licenses and unmatched imports fail before package mutation', async t => {
  for (const mutation of ['missing', 'duplicate', 'corrupt', 'unmatched']) {
    const { root, html, css, manifest, settings } = importedFixture(t);
    if (mutation === 'missing') manifest.licenses.pop();
    if (mutation === 'duplicate') manifest.licenses[2].family = manifest.licenses[0].family;
    if (mutation === 'corrupt') fs.writeFileSync(path.join(root, 'dependencies', manifest.licenses[2].path), 'changed');
    if (mutation === 'unmatched') manifest.stylesheet.url = `${manifest.stylesheet.url}&text=changed`;
    fs.writeFileSync(settings.dependencyManifestPath, JSON.stringify(manifest));
    await assert.rejects(() => vendorGoogleFonts(settings), /one license per|pin changed|exactly one authored/);
    assert.equal(fs.readFileSync(path.join(root, 'package/index.html'), 'utf8'), html);
    assert.equal(fs.readFileSync(path.join(root, 'package/assets/main.css'), 'utf8'), css);
    assert.equal(fs.existsSync(path.join(root, 'package/vendor')), false);
  }
});

test('Dependency capture pins every family license and unchanged remote WOFF2 byte stream', async t => {
  const { root, manifest, settings, upstream, url } = importedFixture(t);
  const requested = [];
  const upstreamBodies = new Map([[url, Buffer.from(upstream)], ...[...manifest.fonts, ...manifest.licenses].map(pin => [pin.url, fs.readFileSync(path.join(root, 'dependencies', pin.path))])]);
  t.mock.method(globalThis, 'fetch', async (address, options) => {
    requested.push({ address, userAgent: options.headers['user-agent'] });
    assert.ok(upstreamBodies.has(address), 'Unexpected remote origin/path');
    return new Response(upstreamBodies.get(address));
  });
  const result = await captureGoogleFontDependencies({ stylesheetUrl: url, userAgent: 'Explicit synthetic browser variant', inputArtifactHash: settings.inputArtifactHash, outputDirectory: path.join(root, 'snapshot'), licenses: manifest.licenses.map(({ family, url }) => ({ family, url })) });
  const captured = JSON.parse(fs.readFileSync(result.manifestPath));
  assert.equal(captured.schemaVersion, 2);
  assert.equal(captured.stylesheet.sha256, hash(upstream));
  assert.deepEqual(captured.licenses.map(pin => ({ family: pin.family, sha256: pin.sha256 })), manifest.licenses.map(pin => ({ family: pin.family, sha256: pin.sha256 })));
  assert.deepEqual(captured.fonts.map(pin => pin.sha256), manifest.fonts.map(pin => pin.sha256));
  assert.ok(requested.every(request => request.userAgent === 'Explicit synthetic browser variant'));
  assert.equal(requested.length, 7);
});
