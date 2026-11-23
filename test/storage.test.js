'use strict';

/** Instance URL parsing and deduplication. */
const test = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../core/storage.js');

test('Instance URL parser normalizes self-hosted & cloud Zammad URLs safely', () => {
  const bare = storage.parseInstanceInput('tickets.acme.com');
  assert.equal(bare.ok, true);
  assert.equal(bare.origin, 'https://tickets.acme.com');
  assert.equal(bare.matchPattern, 'https://tickets.acme.com/*');

  const deepLink = storage.parseInstanceInput('https://helpdesk.company.org:8443/#ticket/zoom/42');
  assert.equal(deepLink.ok, true);
  assert.equal(deepLink.origin, 'https://helpdesk.company.org:8443');
  assert.equal(deepLink.host, 'helpdesk.company.org:8443');
  assert.equal(deepLink.matchPattern, 'https://helpdesk.company.org/*');

  const localhost = storage.parseInstanceInput('http://localhost:3000');
  assert.equal(localhost.ok, true);
  assert.equal(localhost.matchPattern, 'http://localhost/*');

  assert.equal(storage.parseInstanceInput('chrome://extensions').ok, false);
  assert.equal(storage.parseInstanceInput('').ok, false);
});

test('Instance deduplication removes duplicate origin/host entries safely', () => {
  const dupes = [
    { origin: 'https://tickets.example.com', host: 'tickets.example.com', enabled: true },
    { origin: 'https://tickets.example.com', host: 'tickets.example.com', enabled: true },
    { origin: 'https://help.example.org', host: 'help.example.org', enabled: false },
  ];
  const deduped = storage.dedupeInstances(dupes);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].host, 'tickets.example.com');
  assert.equal(deduped[1].host, 'help.example.org');
});

test('Search history is deduplicated, newest first and capped; stored positions are validated', async () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
  globalThis.dispatchEvent = () => true;
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    }
  };
  try {
    for (let i = 0; i < 15; i++) await storage.pushSearchHistory(`query ${i}`);
    await storage.pushSearchHistory('query 3');
    const settings = await storage.loadSettings();
    assert.equal(settings.searchHistory.length, 12);
    assert.equal(settings.searchHistory[0].query, 'query 3');
    assert.equal(settings.searchHistory.filter((h) => h.query === 'query 3').length, 1);

    await storage.saveUiPosition('searchFlyout', { x: 120.4, y: 80 });
    await storage.saveSettings({
      uiPositions: Object.assign({}, (await storage.loadSettings()).uiPositions, {
        popover: { x: 'evil', y: 1 },
        unknown: { x: 1, y: 1 },
      }),
    });
    let positions = (await storage.loadSettings()).uiPositions;
    assert.deepEqual(positions, { searchFlyout: { x: 120, y: 80 } });

    await storage.saveUiPosition('searchFlyout', null);
    positions = (await storage.loadSettings()).uiPositions;
    assert.deepEqual(positions, {});
  } finally {
    delete globalThis.localStorage;
    delete globalThis.dispatchEvent;
    delete globalThis.CustomEvent;
  }
});
