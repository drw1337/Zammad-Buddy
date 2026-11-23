'use strict';

/** Translations: defaults and EN/DE parity. */
const test = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../core/storage.js');
const i18n = require('../core/i18n.js');

test('i18n defaults to English and translates category keys into EN and DE', () => {
  assert.equal(storage.DEFAULT_SETTINGS.language, 'en');
  assert.equal(i18n.translateCategories('en', ['color', 'fontFamily']), 'text color, font family');
  assert.equal(i18n.translateCategories('de', ['color', 'fontFamily']), 'Textfarbe, Schriftart');
});

test('i18n dictionaries stay in parity (EN & DE share every key, incl. popover titles)', () => {
  const enKeys = Object.keys(i18n.MESSAGES.en).sort();
  const deKeys = Object.keys(i18n.MESSAGES.de).sort();
  assert.deepEqual(deKeys, enKeys);
  for (const key of [
    'popTitleCode',
    'popTitleLink',
    'popTitleTable',
    'popTitleEmoji',
    'popTitleHighlight',
    'popCloseTitle',
  ]) {
    assert.ok(i18n.MESSAGES.en[key], `missing EN key ${key}`);
    assert.ok(i18n.MESSAGES.de[key], `missing DE key ${key}`);
  }
  assert.equal(i18n.t('de', 'popTitleCode'), 'Code-Block einfügen');
});
