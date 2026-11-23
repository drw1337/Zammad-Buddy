'use strict';

/** Inert HTML parsing and a guard against raw HTML sinks in runtime code. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const safeHtml = require('../core/safe-html.js');
const { MiniDOMParser, MiniDocument } = require('./mini-dom.js');

const ROOT = path.resolve(__dirname, '..');

test('setHtml replaces the children with the parsed markup', () => {
  const doc = new MiniDocument();
  const el = doc.createElement('button');
  el.appendChild(doc.createTextNode('old'));
  const nodes = safeHtml.setHtml(
    el,
    '<svg viewBox="0 0 16 16"><path d="M1 1h14"></path></svg><span>x</span>',
    MiniDOMParser
  );
  assert.equal(nodes.length, 2);
  assert.equal(el.innerHTML, '<svg viewbox="0 0 16 16"><path d="M1 1h14"></path></svg><span>x</span>');
});

test('setHtml with empty input clears the element', () => {
  const doc = new MiniDocument();
  const el = doc.createElement('span');
  el.appendChild(doc.createTextNode('old'));
  safeHtml.setHtml(el, undefined, MiniDOMParser);
  assert.equal(el.innerHTML, '');
});

function runtimeFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...runtimeFiles(rel));
    else if (entry.name.endsWith('.js')) out.push(rel);
  }
  return out;
}

test('runtime code assigns markup only through safeHtml', () => {
  const files = ['background.js', 'content.js', ...['core', 'features', 'popup'].flatMap(runtimeFiles)];
  for (const rel of files) {
    if (rel === path.join('core', 'safe-html.js')) continue; // documents the sinks it replaces
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.doesNotMatch(src, /insertAdjacentHTML|createContextualFragment|outerHTML\s*=/, rel);
    for (const m of src.matchAll(/\.innerHTML\s*=\s*([^;]+);/g)) {
      assert.match(m[1].trim(), /^'[^']*'$/, `${rel}: innerHTML may only be set to a string literal`);
    }
  }
});
