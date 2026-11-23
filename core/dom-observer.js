/**
 * Buddy for Zammad – Feature registry and editor scanner.
 *
 * Zammad is a single-page app: editors appear and disappear as agents open
 * tickets. This module watches the document, attaches every registered feature
 * to each new editor (see `SELECTORS.editor` in zammad-dom.js), runs the
 * cleanups when an editor leaves the DOM and passes settings changes on.
 *
 * A feature is `{ id, onStart?(settings), onSettingsChanged?(settings),
 * attachEditor?(editorEl, getSettings) => cleanup }`.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const zammadDom = ns.zammadDom || (isNode ? require('./zammad-dom.js') : null);
  const editorContext = ns.editorContext || (isNode ? require('./editor-context.js') : null);

  const features = [];
  const boundEditors = new Map(); // editor element -> cleanup functions
  let currentSettings = null;
  let rootObserver = null;
  let scanScheduled = false;

  /** Whether the current page belongs to an instance the user enabled. */
  function isCurrentHostConnected(settings) {
    if (!settings) return false;
    const loc = root.location;
    if (!loc || !loc.hostname) return true;
    if (loc.protocol === 'file:') return true; // offline sandbox
    if (!Array.isArray(settings.instances) || settings.instances.length === 0) return true;

    const host = loc.host.toLowerCase();
    const hostname = loc.hostname.toLowerCase();
    const match = settings.instances.find(
      (inst) =>
        inst &&
        (String(inst.host || '').toLowerCase() === host ||
          String(inst.origin || '')
            .toLowerCase()
            .includes(`//${hostname}`))
    );
    return match ? match.enabled !== false : false;
  }

  function hasAnyActiveFeature(settings) {
    return Boolean(
      settings &&
      (settings.enabled !== false ||
        settings.wysiwygEnabled !== false ||
        settings.inPageSearchEnabled !== false)
    );
  }

  /** Feature flags combined with "is this host enabled". */
  function buildEffectiveSettings(settings) {
    const hostActive = isCurrentHostConnected(settings);
    const on = (key) => Boolean(settings && settings[key] !== false && hostActive);
    return Object.assign({}, settings, {
      hostActive,
      enabled: on('enabled'),
      wysiwygEnabled: on('wysiwygEnabled'),
      inPageSearchEnabled: on('inPageSearchEnabled'),
    });
  }

  function registerFeature(feature) {
    if (!feature || typeof feature.id !== 'string') throw new Error('Feature requires a unique id');
    if (!features.some((f) => f.id === feature.id)) features.push(feature);
  }

  function runCleanups(cleanups) {
    for (const fn of cleanups) {
      try {
        fn();
      } catch (err) {
        console.warn('[Buddy for Zammad] Cleanup error:', err);
      }
    }
  }

  function detachAllEditors() {
    for (const cleanups of boundEditors.values()) runCleanups(cleanups);
    boundEditors.clear();
  }

  function attachFeatures(editorEl) {
    const cleanups = [];
    for (const feature of features) {
      if (typeof feature.attachEditor !== 'function') continue;
      try {
        const cleanup = feature.attachEditor(editorEl, () => currentSettings);
        if (typeof cleanup === 'function') cleanups.push(cleanup);
      } catch (err) {
        console.error(`[Buddy for Zammad] Init error in ${feature.id}:`, err);
      }
    }
    boundEditors.set(editorEl, cleanups);
  }

  function scanEditors() {
    scanScheduled = false;
    const doc = root.document;
    if (!doc || !doc.body) return;

    if (!isCurrentHostConnected(currentSettings) || !hasAnyActiveFeature(currentSettings)) {
      detachAllEditors();
      return;
    }

    for (const [editorEl, cleanups] of boundEditors.entries()) {
      if (!doc.contains(editorEl)) {
        runCleanups(cleanups);
        boundEditors.delete(editorEl);
      }
    }

    for (const editorEl of doc.querySelectorAll(zammadDom.SELECTORS.editor)) {
      if (!boundEditors.has(editorEl)) attachFeatures(editorEl);
    }
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    if (typeof root.requestAnimationFrame === 'function') root.requestAnimationFrame(scanEditors);
    else setTimeout(scanEditors, 50);
  }

  function start(initialSettings) {
    currentSettings = buildEffectiveSettings(initialSettings);
    for (const feature of features) {
      if (typeof feature.onStart === 'function') feature.onStart(currentSettings);
    }
    scanEditors();

    if (rootObserver) rootObserver.disconnect();
    rootObserver = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.addedNodes.length > 0 || m.removedNodes.length > 0)) scheduleScan();
    });
    if (root.document && root.document.body) {
      rootObserver.observe(root.document.body, { childList: true, subtree: true });
    }
  }

  function updateSettings(nextSettings) {
    currentSettings = buildEffectiveSettings(nextSettings);
    for (const feature of features) {
      if (typeof feature.onSettingsChanged === 'function') feature.onSettingsChanged(currentSettings);
    }
    scanEditors();
  }

  const api = {
    EDITOR_SELECTOR: zammadDom.SELECTORS.editor,
    // Re-exported for features that only depend on the observer.
    detectEditorContext: editorContext.detectEditorContext,
    watchEditorContext: editorContext.watchEditorContext,
    registerFeature,
    start,
    updateSettings,
    scanEditors,
  };

  ns.observer = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
