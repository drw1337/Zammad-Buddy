/**
 * Buddy for Zammad – Cross-browser settings and instance storage.
 * Supports Chrome MV3, Firefox MV3 and a localStorage fallback for the offline sandbox.
 * Author: drw1337
 */
(function (root) {
  'use strict';

  // Legacy key name, kept on purpose so connected instances survive updates
  const STORAGE_KEY = 'zammadCompanionConfig';

  const DEFAULT_SETTINGS = Object.freeze({
    language: 'en', // 'en' (default) | 'de'
    enabled: true,
    autoCleanPaste: true,
    xrayHighlight: true,
    preserveBlockquotes: true,
    wysiwygEnabled: true,
    wysiwygCollapsed: false,
    inPageSearchEnabled: true,
    savedSearches: [], // Array<{ id: string, label: string, query: string }>
    recentEmojis: [], // Array<string>
    searchHistory: [], // Array<{ query: string, at: number }>, newest first
    uiPositions: {}, // { searchFlyout?: { x, y }, popover?: { x, y } } in CSS pixels
    instances: [], // Array<{ origin: string, matchPattern: string, host: string, enabled: boolean, addedAt: string }>
    stats: {
      cleanedCount: 0,
    },
  });

  function getExtStorage() {
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      return { api: browser.storage.local, events: browser.storage.onChanged, isPromise: true };
    }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return { api: chrome.storage.local, events: chrome.storage.onChanged, isPromise: false };
    }
    return null;
  }

  /**
   * Normalizes user input (e.g. "support.example.com" or "https://support.example.com/#ticket/zoom/1")
   * into an instance object with an MV3-compatible match pattern (no port in the host part).
   */
  function parseInstanceInput(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') {
      return { ok: false, errorKey: 'errEmptyUrl' };
    }
    let candidate = rawInput.trim();
    if (!candidate) {
      return { ok: false, errorKey: 'errEmptyUrl' };
    }

    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
      candidate = `https://${candidate}`;
    }

    let url;
    try {
      url = new URL(candidate);
    } catch (_) {
      return { ok: false, errorKey: 'errInvalidUrl' };
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { ok: false, errorKey: 'errInvalidUrl' };
    }

    if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) {
      return { ok: false, errorKey: 'errInvalidUrl' };
    }

    // MV3 match patterns reject ports in the host; protocol://hostname/* covers all ports.
    const matchPattern = `${url.protocol}//${url.hostname}/*`;
    const origin = url.origin;
    const host = url.host;
    const hostname = url.hostname;

    return {
      ok: true,
      origin,
      host,
      hostname,
      matchPattern,
    };
  }

  function dedupeInstances(rawList) {
    if (!Array.isArray(rawList)) return [];
    const seen = new Set();
    const out = [];
    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const key = String(item.origin || item.host || '')
        .trim()
        .toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function sanitizeSavedSearches(rawList) {
    if (!Array.isArray(rawList)) return [];
    const out = [];
    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const label = String(item.label || '').trim();
      const query = String(item.query || '').trim();
      if (!label || !query) continue;
      out.push({
        id: String(item.id || `${Date.now()}-${out.length}`),
        label: label.slice(0, 60),
        query: query.slice(0, 1000),
      });
      if (out.length >= 25) break;
    }
    return out;
  }

  function sanitizeRecentEmojis(rawList) {
    if (!Array.isArray(rawList)) return [];
    const seen = new Set();
    const out = [];
    for (const em of rawList) {
      const s = String(em || '').trim();
      if (!s || s.length > 16 || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
      if (out.length >= 8) break;
    }
    return out;
  }

  const SEARCH_HISTORY_LIMIT = 12;
  const UI_POSITION_KEYS = ['searchFlyout', 'popover'];
  const MAX_OFFSET = 10000;

  function sanitizeSearchHistory(rawList) {
    if (!Array.isArray(rawList)) return [];
    const seen = new Set();
    const out = [];
    for (const item of rawList) {
      const query = String((item && item.query) || '')
        .trim()
        .slice(0, 1000);
      if (!query || seen.has(query)) continue;
      seen.add(query);
      out.push({ query, at: Number.isFinite(item.at) ? item.at : 0 });
      if (out.length >= SEARCH_HISTORY_LIMIT) break;
    }
    return out;
  }

  /** Only finite, bounded numbers survive; anything else resets to the default position. */
  function sanitizeUiPositions(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const key of UI_POSITION_KEYS) {
      const pos = raw[key];
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        out[key] = {
          x: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(pos.x))),
          y: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(pos.y))),
        };
      }
    }
    return out;
  }

  function mergeWithDefaults(rawObj) {
    const src = rawObj && typeof rawObj === 'object' ? rawObj : {};
    return {
      language: src.language === 'de' ? 'de' : 'en',
      enabled: src.enabled !== false,
      autoCleanPaste: src.autoCleanPaste !== false,
      xrayHighlight: src.xrayHighlight !== false,
      preserveBlockquotes: src.preserveBlockquotes !== false,
      wysiwygEnabled: src.wysiwygEnabled !== false,
      wysiwygCollapsed: src.wysiwygCollapsed === true,
      inPageSearchEnabled: src.inPageSearchEnabled !== false,
      savedSearches: sanitizeSavedSearches(src.savedSearches),
      recentEmojis: sanitizeRecentEmojis(src.recentEmojis),
      searchHistory: sanitizeSearchHistory(src.searchHistory),
      uiPositions: sanitizeUiPositions(src.uiPositions),
      instances: dedupeInstances(src.instances),
      stats: {
        cleanedCount: src.stats && typeof src.stats.cleanedCount === 'number' ? src.stats.cleanedCount : 0,
      },
    };
  }

  async function loadSettings() {
    const ext = getExtStorage();
    if (!ext) {
      try {
        const raw = root.localStorage ? root.localStorage.getItem(STORAGE_KEY) : null;
        return mergeWithDefaults(raw ? JSON.parse(raw) : null);
      } catch (_) {
        return mergeWithDefaults(null);
      }
    }

    if (ext.isPromise) {
      const data = await ext.api.get(STORAGE_KEY);
      return mergeWithDefaults(data && data[STORAGE_KEY]);
    }

    return new Promise((resolve) => {
      ext.api.get([STORAGE_KEY], (data) => {
        resolve(mergeWithDefaults(data && data[STORAGE_KEY]));
      });
    });
  }

  async function saveSettings(partial) {
    const current = await loadSettings();
    const next = mergeWithDefaults(Object.assign({}, current, partial));
    const ext = getExtStorage();

    if (!ext) {
      try {
        if (root.localStorage) {
          root.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        root.dispatchEvent(new CustomEvent('zammad-companion:settings-changed', { detail: next }));
      } catch (_) {
        // localStorage may be blocked
      }
      return next;
    }

    const payload = { [STORAGE_KEY]: next };
    if (ext.isPromise) {
      await ext.api.set(payload);
      return next;
    }

    return new Promise((resolve) => {
      ext.api.set(payload, () => resolve(next));
    });
  }

  async function incrementCleanedStat(delta = 1) {
    const current = await loadSettings();
    const nextCount = (current.stats?.cleanedCount || 0) + Math.max(1, delta);
    return saveSettings({ stats: { cleanedCount: nextCount } });
  }

  async function pushRecentEmoji(emoji) {
    const clean = String(emoji || '').trim();
    if (!clean) return loadSettings();
    const current = await loadSettings();
    const prev = Array.isArray(current.recentEmojis) ? current.recentEmojis : [];
    const nextList = [clean].concat(prev.filter((e) => e !== clean)).slice(0, 8);
    return saveSettings({ recentEmojis: nextList });
  }

  /** Adds a query to the front of the search history (deduplicated, capped). */
  async function pushSearchHistory(query) {
    const clean = String(query || '').trim();
    if (!clean) return loadSettings();
    const current = await loadSettings();
    const rest = (current.searchHistory || []).filter((item) => item.query !== clean);
    return saveSettings({ searchHistory: [{ query: clean, at: Date.now() }].concat(rest) });
  }

  /**
   * Stores or clears (`position === null`) the position of a movable window.
   * @param {'searchFlyout' | 'popover'} key
   * @param {{ x: number, y: number } | null} position
   */
  async function saveUiPosition(key, position) {
    const current = await loadSettings();
    const next = Object.assign({}, current.uiPositions);
    if (position) next[key] = position;
    else delete next[key];
    return saveSettings({ uiPositions: next });
  }

  function onSettingsChanged(callback) {
    const ext = getExtStorage();
    if (!ext) {
      const handler = (ev) => {
        if (ev && ev.detail) {
          callback(mergeWithDefaults(ev.detail));
        }
      };
      root.addEventListener('zammad-companion:settings-changed', handler);
      return () => root.removeEventListener('zammad-companion:settings-changed', handler);
    }

    const listener = (changes, areaName) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) {
        callback(mergeWithDefaults(changes[STORAGE_KEY].newValue));
      }
    };
    ext.events.addListener(listener);
    return () => ext.events.removeListener(listener);
  }

  const api = {
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    parseInstanceInput,
    dedupeInstances,
    loadSettings,
    saveSettings,
    incrementCleanedStat,
    pushRecentEmoji,
    pushSearchHistory,
    saveUiPosition,
    onSettingsChanged,
  };

  const ZammadBuddy = (root.ZammadBuddy = root.ZammadBuddy || {});
  ZammadBuddy.storage = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
