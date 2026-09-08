#!/usr/bin/env node
// Pin an authored font dependency, then relocate URLs only in a packaged copy.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, realpath, lstat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = value => `${JSON.stringify(value, null, 2)}\n`;
const check = (ok, message) => { if (!ok) throw new Error(`Font packaging: ${message}`); };
const pin = (path, bytes) => ({ path, bytes: bytes.length, sha256: hash(bytes) });
const fontUrls = css => [...new Set([...css.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)].map(match => match[2]))];
const fontFamilies = css => [...new Set([...css.matchAll(/font-family\s*:\s*(?:"([^"]+)"|'([^']+)'|([^;}]+))/gi)].map(match => (match[1] ?? match[2] ?? match[3]).trim()))];
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function licenseRecords(manifest, css) {
  if (manifest.schemaVersion === 1) { check(manifest.license, 'font license is missing'); return [manifest.license]; }
  const families = fontFamilies(css);
  const licenses = manifest.licenses;
  check(Array.isArray(licenses) && licenses.length > 0 && licenses.length <= 8, 'font licenses need 1–8 family records');
  check(families.length === licenses.length && new Set(licenses.map(item => item.family)).size === licenses.length
    && licenses.every(item => typeof item.family === 'string' && families.includes(item.family)), 'exactly one license per stylesheet font family is required');
  return licenses;
}

// Read only real top-level @import URLs; quoted semicolons, comments and media suffixes stay untouched.
function stylesheetImports(css) {
  const imports = []; let depth = 0;
  const endQuote = (start, quote) => { let index = start; while (index < css.length) { if (css[index] === '\\') index += 2; else if (css[index++] === quote) return index; } return index; };
  for (let index = 0; index < css.length;) {
    if (css.startsWith('/*', index)) { const end = css.indexOf('*/', index + 2); index = end < 0 ? css.length : end + 2; continue; }
    if (css[index] === '"' || css[index] === "'") { index = endQuote(index + 1, css[index]); continue; }
    if (css[index] === '{') depth++;
    if (css[index] === '}') depth--;
    if (depth === 0 && /^@import\b/i.test(css.slice(index, index + 8))) {
      let cursor = index + 7;
      while (/\s/.test(css[cursor] || '') && cursor < css.length) cursor++;
      if (/^url\(/i.test(css.slice(cursor, cursor + 4))) { cursor += 4; while (/\s/.test(css[cursor] || '') && cursor < css.length) cursor++; }
      const quote = css[cursor] === '"' || css[cursor] === "'" ? css[cursor++] : null;
      const start = cursor;
      if (quote) cursor = endQuote(cursor, quote) - 1;
      else while (cursor < css.length && !/[\s);]/.test(css[cursor])) cursor++;
      imports.push({ start, end: cursor, url: css.slice(start, cursor) });
      index = Math.max(index + 7, cursor + (quote ? 1 : 0)); continue;
    }
    index++;
  }
  return imports;
}
const safePath = value => { check(typeof value === 'string' && value && !/[\\%?#\x00-\x1f]/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..'), 'unsafe relative path'); return value; };
const checkedUrl = (value, hostname, prefix) => { const url = new URL(value); check(url.protocol === 'https:' && url.hostname === hostname && !url.username && !url.password && !url.port && url.pathname.startsWith(prefix), 'unexpected dependency origin/path'); return url.href; };
async function readPin(root, record) {
  const path = join(root, safePath(record.path));
  check((await lstat(path)).isFile() && (await realpath(path)).startsWith(`${await realpath(root)}${sep}`), 'dependency pin escapes its root');
  const bytes = await readFile(path);
  check(bytes.length === record.bytes && hash(bytes) === record.sha256, 'dependency pin changed');
  return bytes;
}

/** Snapshot remote bytes once. No model calls, source mutation, font conversion or subsetting. */
export async function captureGoogleFontDependencies({ stylesheetUrl, userAgent, inputArtifactHash, outputDirectory, licenseUrl, licenses, capturedStylesheetPath = null }) {
  checkedUrl(stylesheetUrl, 'fonts.googleapis.com', '/css');
  check(!(licenseUrl && licenses), 'use either the legacy license URL or family license records');
  const requestedLicenses = licenses ?? [{ url: licenseUrl }];
  check(Array.isArray(requestedLicenses) && requestedLicenses.length > 0 && requestedLicenses.length <= 8, 'font licenses need 1–8 records');
  requestedLicenses.forEach(license => checkedUrl(license.url, 'raw.githubusercontent.com', '/google/fonts/'));
  check(typeof userAgent === 'string' && userAgent.length > 0 && userAgent.length <= 1000 && /^[a-f0-9]{64}$/.test(inputArtifactHash), 'request variant and submitted artifact hash are required');
  await mkdir(outputDirectory, { recursive: true });
  check((await readdir(outputDirectory)).length === 0, 'snapshot directory must be empty');
  await mkdir(join(outputDirectory, 'upstream'));
  let totalBytes = 0;
  const download = async (url, maximum) => {
    const response = await fetch(url, { headers: { 'user-agent': userAgent }, redirect: 'error', signal: AbortSignal.timeout(30000) });
    check(response.ok, `dependency returned HTTP ${response.status}`);
    const chunks = []; let bytes = 0;
    for await (const chunk of response.body) { bytes += chunk.length; totalBytes += chunk.length; check(bytes <= maximum && totalBytes <= 128 * 1024 * 1024, 'dependency snapshot exceeds its byte bound'); chunks.push(chunk); }
    return Buffer.concat(chunks);
  };
  const store = async (bytes, extension) => { const record = pin(`upstream/${hash(bytes)}${extension}`, bytes); await writeFile(join(outputDirectory, record.path), bytes, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; }); return record; };
  const css = capturedStylesheetPath ? await readFile(capturedStylesheetPath) : await download(stylesheetUrl, 1024 * 1024);
  check(css.length <= 1024 * 1024, 'stylesheet exceeds 1 MiB');
  const cssText = css.toString('utf8');
  check(!/@import\b/i.test(cssText), 'nested stylesheet imports need explicit packaging review');
  licenseRecords({ schemaVersion: licenses ? 2 : 1, licenses, license: requestedLicenses[0] }, cssText);
  const urls = fontUrls(cssText);
  check(urls.length > 0 && urls.length <= 512, 'font stylesheet needs 1–512 explicitly pinned files');
  urls.forEach(url => { checkedUrl(url, 'fonts.gstatic.com', '/s/'); check(new URL(url).pathname.endsWith('.woff2'), 'only the authored WOFF2 delivery is supported'); });
  const fonts = new Array(urls.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, urls.length) }, async () => {
    while (next < urls.length) { const index = next++; const bytes = await download(urls[index], 4 * 1024 * 1024); check(bytes.subarray(0, 4).toString() === 'wOF2', 'remote font is not WOFF2'); fonts[index] = { url: urls[index], ...await store(bytes, '.woff2') }; }
  }));
  const capturedLicenses = await Promise.all(requestedLicenses.map(async license => {
    const bytes = await download(license.url, 64 * 1024);
    check(bytes.toString().includes('SIL OPEN FONT LICENSE') && bytes.toString().includes('Copyright'), 'upstream license notice is incomplete');
    return { ...(licenses ? { family: license.family } : {}), url: license.url, ...await store(bytes, '.txt') };
  }));
  const manifest = { kind: 'vasir-game-font-dependencies', schemaVersion: licenses ? 2 : 1, inputArtifactHash, capturedAt: new Date().toISOString(), request: { userAgent, stylesheetUrl, capturedStylesheet: Boolean(capturedStylesheetPath) }, stylesheet: { url: stylesheetUrl, ...await store(css, '.css') }, fonts, ...(licenses ? { licenses: capturedLicenses } : { license: capturedLicenses[0] }) };
  const manifestPath = join(outputDirectory, 'font-dependencies.json'); await writeFile(manifestPath, encode(manifest), { flag: 'wx' });
  return { manifestPath, sha256: hash(encode(manifest)), fontFiles: fonts.length, bytes: totalBytes };
}

/** Called before the existing build receipt hashes output.entries. */
export async function vendorGoogleFonts({ packageRoot, frozenSourceRoot, entrypoint = 'index.html', inputArtifactHash, dependencyManifestPath }) {
  const root = await realpath(packageRoot); const source = await realpath(frozenSourceRoot);
  check(root !== source && !root.startsWith(`${source}${sep}`), 'refusing to mutate the frozen submission');
  const manifestBytes = await readFile(dependencyManifestPath); const manifest = JSON.parse(manifestBytes);
  check(manifest.kind === 'vasir-game-font-dependencies' && [1, 2].includes(manifest.schemaVersion) && manifest.inputArtifactHash === inputArtifactHash, 'font snapshot does not match the submitted artifact');
  const dependencyRoot = dirname(dependencyManifestPath);
  const originalCss = await readPin(dependencyRoot, manifest.stylesheet);
  const upstreamCss = originalCss.toString('utf8');
  const licenses = licenseRecords(manifest, upstreamCss);
  const urls = fontUrls(upstreamCss);
  check(urls.length === manifest.fonts.length && urls.every(url => manifest.fonts.some(font => font.url === url)), 'font URL inventory changed');
  const htmlPath = join(root, safePath(entrypoint)); const originalHtml = await readFile(htmlPath);
  check((await lstat(htmlPath)).isFile() && (await realpath(htmlPath)).startsWith(`${root}${sep}`), 'entrypoint escapes package');
  const vendorRoot = `vendor/fonts/${manifest.stylesheet.sha256}`;
  const cssPath = `${vendorRoot}/font.css`;
  const relativeCssPath = relative(dirname(htmlPath), join(root, cssPath)).split(sep).join('/');
  const rewrites = [];
  let html = originalHtml.toString('utf8'); let stylesheetMatches = 0;
  html = html.replace(/(<link\b[^>]*\bhref\s*=\s*)(["'])([^"']+)(\2)/gi, (match, prefix, quote, value, suffix) => {
    const decoded = value.replaceAll('&amp;', '&');
    let replacement;
    if (decoded === manifest.stylesheet.url) { replacement = relativeCssPath; stylesheetMatches++; }
    else if (['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(decoded)) replacement = './';
    else return match;
    rewrites.push({ file: entrypoint, from: value, to: replacement, reason: decoded === manifest.stylesheet.url ? 'Relocate exact pinned stylesheet' : 'Relocate preconnect to packaged origin' });
    return `${prefix}${quote}${replacement}${suffix}`;
  });
  const rewrittenStylesheets = [];
  const cssChanges = new Map();
  const localStylesheets = new Set([...originalHtml.toString('utf8').matchAll(/<link\b[^>]*>/gi)].flatMap(([tag]) => {
    const href = tag.match(/\bhref\s*=\s*(["'])([^"']+)\1/i)?.[2];
    const rel = tag.match(/\brel\s*=\s*(["'])([^"']+)\1/i)?.[2];
    if (!href || !rel?.split(/\s+/).includes('stylesheet')) return [];
    const url = new URL(href.replaceAll('&amp;', '&'), `https://package.invalid/${entrypoint}`);
    return url.origin === 'https://package.invalid' && url.pathname.endsWith('.css') ? [safePath(url.pathname.slice(1))] : [];
  }));
  for (const name of localStylesheets) {
    const filePath = join(root, name);
    check((await lstat(filePath)).isFile() && (await realpath(filePath)).startsWith(`${root}${sep}`), 'authored stylesheet escapes package');
    const original = await readFile(filePath);
    check(original.length <= 4 * 1024 * 1024, 'authored stylesheet exceeds 4 MiB');
    let contents = original.toString('utf8');
    const matches = stylesheetImports(contents).filter(item => item.url === manifest.stylesheet.url);
    const replacement = relative(dirname(filePath), join(root, cssPath)).split(sep).join('/');
    for (const item of matches.reverse()) {
      contents = `${contents.slice(0, item.start)}${replacement}${contents.slice(item.end)}`;
      rewrites.push({ file: name, from: item.url, to: replacement, reason: 'Relocate exact pinned stylesheet import' });
      stylesheetMatches++;
    }
    if (matches.length) {
      const packaged = Buffer.from(contents);
      cssChanges.set(name, packaged);
      rewrittenStylesheets.push({ original: pin(name, original), packaged: pin(name, packaged) });
    }
  }
  check(stylesheetMatches === 1, 'expected exactly one authored stylesheet link or CSS import');
  let css = upstreamCss;
  const additions = new Map();
  for (const font of manifest.fonts) {
    checkedUrl(font.url, 'fonts.gstatic.com', '/s/');
    const bytes = await readPin(dependencyRoot, font); const name = `${font.sha256}.woff2`;
    additions.set(`${vendorRoot}/${name}`, bytes);
    const occurrences = css.split(font.url).length - 1;
    check(occurrences > 0, 'pinned font was not referenced');
    css = css.replaceAll(font.url, name);
    rewrites.push({ file: cssPath, from: font.url, to: name, occurrences, reason: 'Relocate exact pinned font bytes' });
  }
  check(fontUrls(css).every(url => /^[a-f0-9]{64}\.woff2$/.test(url)), 'packaged stylesheet still has an external font URL');
  const licenseNotices = await Promise.all(licenses.map(async license => `${license.family ? `<h2>${escapeHtml(license.family)}</h2>` : ''}<pre>${escapeHtml((await readPin(dependencyRoot, license)).toString('utf8'))}</pre>`));
  additions.set(`${vendorRoot}/LICENSE.html`, Buffer.from(`<!doctype html><meta charset="utf-8"><title>Bundled font licenses</title>${licenseNotices.join('\n')}\n`));
  additions.set(cssPath, Buffer.from(css));
  // Read and validate the entire dependency before the first packaged write.
  await mkdir(join(root, vendorRoot), { recursive: true });
  check((await readdir(join(root, vendorRoot))).length === 0, 'vendored font directory already exists');
  for (const [name, bytes] of additions) await writeFile(join(root, name), bytes, { flag: 'wx' });
  for (const [name, bytes] of cssChanges) await writeFile(join(root, name), bytes);
  await writeFile(htmlPath, html);
  return { kind: 'vasir-game-font-relocation', schemaVersion: 1, inputArtifactHash, sourceEdited: false, dependencyManifest: { path: resolve(dependencyManifestPath), bytes: manifestBytes.length, sha256: hash(manifestBytes) }, originalStylesheet: manifest.stylesheet, originalEntrypoint: pin(entrypoint, originalHtml), packagedEntrypoint: pin(entrypoint, Buffer.from(html)), rewrittenStylesheets, additions: [...additions].map(([name, bytes]) => ({ ...pin(name, bytes), type: 'file' })), rewrites, operation: 'Only HTML/CSS transport URLs relocated; font bytes, CSS descriptors, game source and logic preserved. Full upstream copyright/license notices bundled.' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, settingsPath] = process.argv.slice(2);
  check(settingsPath && ['--capture', '--vendor'].includes(command), 'Usage: vendor-google-fonts.mjs --capture|--vendor <private-settings.json>');
  const settings = JSON.parse(await readFile(resolve(settingsPath)));
  process.stdout.write(encode(await (command === '--capture' ? captureGoogleFontDependencies(settings) : vendorGoogleFonts(settings))));
}
