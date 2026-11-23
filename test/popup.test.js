'use strict';

/** Popup markup: every translation key and every bound setting exists. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const i18n = require('../core/i18n.js');
const storage = require('../core/storage.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'popup', 'popup.html'), 'utf8');

test('every data-i18n key in popup.html exists in English and German', () => {
  const keys = Array.from(html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g), (m) => m[1]);
  assert.ok(keys.length > 20, 'expected the popup to be translated via data-i18n');
  for (const key of keys) {
    assert.ok(i18n.MESSAGES.en[key], `missing EN key ${key}`);
    assert.ok(i18n.MESSAGES.de[key], `missing DE key ${key}`);
  }
});

test('every data-setting toggle maps to a known default setting', () => {
  const defaults = storage.DEFAULT_SETTINGS;
  assert.ok(defaults, 'storage exports its defaults');
  const settingKeys = Array.from(html.matchAll(/data-setting="([^"]+)"/g), (m) => m[1]);
  assert.equal(settingKeys.length, 7);
  for (const key of settingKeys) assert.ok(key in defaults, `unknown setting ${key}`);
});

test('popup scripts referenced by popup.html exist', () => {
  const scripts = Array.from(html.matchAll(/<script src="([^"]+)"/g), (m) => m[1]);
  for (const rel of scripts) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'popup', rel)), `missing ${rel}`);
  }
});
