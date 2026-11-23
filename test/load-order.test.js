'use strict';

/**
 * Verifies the content-script bundle as the browser loads it: plain scripts in
 * the order of `CONTENT_JS` in background.js, sharing one global object and
 * without CommonJS `require`. Also keeps the offline sandbox in sync.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function readList(name) {
  const src = fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8');
  const match = src.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  assert.ok(match, `${name} not found in background.js`);
  return Array.from(match[1].matchAll(/'([^']+)'/g), (m) => m[1]);
}

test('every file listed in background.js exists', () => {
  for (const rel of [...readList('CONTENT_CSS'), ...readList('CONTENT_JS')]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
  }
});

function extensionAssets(html, prefix, tagPattern) {
  const assets = [];
  for (const match of html.matchAll(tagPattern)) {
    if (match[1].startsWith(prefix)) assets.push(match[1].slice(prefix.length));
  }
  return assets;
}

for (const [name, rel, prefix] of [['offline sandbox', 'test/mock-zammad.html', '../']]) {
  test(`${name} loads the same scripts and styles in the same order`, () => {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.deepEqual(extensionAssets(html, prefix, /<script src="([^"]+)"/g), readList('CONTENT_JS'));
    assert.deepEqual(
      extensionAssets(html, prefix, /<link rel="stylesheet" href="([^"]+)"/g),
      readList('CONTENT_CSS')
    );
  });
}

test('content scripts load as browser scripts and register their namespaces', () => {
  const sandbox = { console, setTimeout, clearTimeout, URL };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  // content.js starts the observer, which needs a real DOM; stop before it.
  for (const rel of readList('CONTENT_JS').filter((f) => f !== 'content.js')) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }

  const ns = sandbox.ZammadBuddy;
  assert.ok(ns, 'ZammadBuddy namespace missing');
  for (const key of [
    'i18n',
    'safeHtml',
    'storage',
    'searchQuery',
    'observer',
    'sanitizer',
    'wysiwygCommands',
    'wysiwyg',
  ]) {
    assert.ok(ns[key], `ZammadBuddy.${key} missing`);
  }
  assert.equal(typeof ns.wysiwygCommands.applyLink, 'function');
  assert.equal(ns.wysiwygCommands.normalizeSafeLinkUrl('example.com').url, 'https://example.com');
});
