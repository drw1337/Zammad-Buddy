/**
 * Buddy for Zammad – Background Service Worker / Script (Chrome & Firefox MV3).
 *
 * Registers the content scripts dynamically for exactly those Zammad
 * instances the user has granted (optional_host_permissions), and injects the
 * extension into open tabs right after connecting, without a page reload.
 *
 * Author: drw1337
 */
(function () {
  'use strict';

  const ext = typeof browser !== 'undefined' ? browser : chrome;
  const STORAGE_KEY = 'zammadCompanionConfig';
  const SCRIPT_ID = 'zammad-companion-content';

  const CONTENT_CSS = [
    'core/theme.css',
    'features/format-guard/format-guard.css',
    'features/wysiwyg/wysiwyg.css',
    'features/search-helper/search-helper.css',
  ];
  const CONTENT_JS = [
    'core/locales/en.js',
    'core/locales/de.js',
    'core/i18n.js',
    'core/storage.js',
    'core/search-query/date-range.js',
    'core/search-query/clauses.js',
    'core/search-query.js',
    'core/zammad-dom.js',
    'core/editor-context.js',
    'core/dom-observer.js',
    'core/draggable.js',
    'core/safe-html.js',
    'features/format-guard/sanitizer/rules.js',
    'features/format-guard/sanitizer/detector.js',
    'features/format-guard/sanitizer/cleaner.js',
    'features/format-guard/sanitizer.js',
    'features/format-guard/paste.js',
    'features/format-guard/status-bar.js',
    'features/format-guard/index.js',
    'features/wysiwyg/editor/dom.js',
    'features/wysiwyg/editor/code-highlight.js',
    'features/wysiwyg/editor/emoji-catalog.js',
    'features/wysiwyg/editor/links.js',
    'features/wysiwyg/editor/note-highlight.js',
    'features/wysiwyg/editor/blocks.js',
    'features/wysiwyg/editor/lists.js',
    'features/wysiwyg/editor/tables.js',
    'features/wysiwyg/editor/formatting.js',
    'features/wysiwyg/editor/preview-sanitizer.js',
    'features/wysiwyg/commands.js',
    'features/wysiwyg/ui/icons.js',
    'features/wysiwyg/ui/popovers/frame.js',
    'features/wysiwyg/ui/popovers/code.js',
    'features/wysiwyg/ui/popovers/link.js',
    'features/wysiwyg/ui/popovers/emoji.js',
    'features/wysiwyg/ui/popovers/table.js',
    'features/wysiwyg/ui/popovers/highlight.js',
    'features/wysiwyg/ui/preview.js',
    'features/wysiwyg/index.js',
    'features/search-helper/panel/kit.js',
    'features/search-helper/panel/filters.js',
    'features/search-helper/panel/presets.js',
    'features/search-helper/panel/syntax-drawer.js',
    'features/search-helper/panel/history.js',
    'features/search-helper/search-panel.js',
    'features/search-helper/index.js',
    'content.js',
  ];

  let syncQueue = Promise.resolve();

  async function readStoredInstances() {
    const data = await ext.storage.local.get(STORAGE_KEY);
    const cfg = (data && data[STORAGE_KEY]) || {};
    return Array.isArray(cfg.instances) ? cfg.instances : [];
  }

  async function hasOriginPermission(matchPattern) {
    try {
      return await ext.permissions.contains({ origins: [matchPattern] });
    } catch (_) {
      return false;
    }
  }

  async function performSync() {
    const instances = await readStoredInstances();
    const activeMatches = new Set();

    for (const inst of instances) {
      if (!inst || inst.enabled === false || !inst.matchPattern) continue;
      if (await hasOriginPermission(inst.matchPattern)) {
        activeMatches.add(inst.matchPattern);
      }
    }

    // Remove the previous dynamic registration
    try {
      const existing = await ext.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
      if (existing && existing.length > 0) {
        await ext.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
      }
    } catch (_) {
      // Not registered yet
    }

    if (activeMatches.size === 0) {
      return { registeredMatches: [] };
    }

    const matches = Array.from(activeMatches);
    await ext.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        matches,
        css: CONTENT_CSS,
        js: CONTENT_JS,
        runAt: 'document_idle',
        persistAcrossSessions: true,
      },
    ]);

    return { registeredMatches: matches };
  }

  function scheduleSync() {
    syncQueue = syncQueue.then(performSync, performSync);
    return syncQueue;
  }

  async function injectIntoTab(tabId) {
    if (typeof tabId !== 'number') return false;
    try {
      await ext.scripting.insertCSS({
        target: { tabId },
        files: CONTENT_CSS,
      });
      await ext.scripting.executeScript({
        target: { tabId },
        files: CONTENT_JS,
      });
      return true;
    } catch (err) {
      console.warn('[Buddy for Zammad] Live injection skipped:', err);
      return false;
    }
  }

  ext.runtime.onInstalled.addListener(() => {
    scheduleSync();
  });

  if (ext.runtime.onStartup) {
    ext.runtime.onStartup.addListener(() => {
      scheduleSync();
    });
  }

  ext.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
      scheduleSync();
    }
  });

  if (ext.permissions && ext.permissions.onRemoved) {
    ext.permissions.onRemoved.addListener(() => {
      scheduleSync();
    });
  }

  if (ext.permissions && ext.permissions.onAdded) {
    ext.permissions.onAdded.addListener(async (perms) => {
      await scheduleSync();
      // Firefox may close the popup while the permission prompt is open:
      // inject into already open tabs of the newly granted origin here.
      if (perms && Array.isArray(perms.origins) && perms.origins.length > 0 && ext.tabs && ext.tabs.query) {
        try {
          const tabs = await ext.tabs.query({ url: perms.origins });
          for (const tab of tabs) {
            if (tab && typeof tab.id === 'number') {
              await injectIntoTab(tab.id);
            }
          }
        } catch (_) {
          // Without the "tabs" permission, query may only return active tabs, which is enough
        }
      }
    });
  }

  ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== 'string') return false;

    if (msg.type === 'zb:sync-instances') {
      (async () => {
        const result = await scheduleSync();
        let injected = false;
        if (typeof msg.injectTabId === 'number') {
          injected = await injectIntoTab(msg.injectTabId);
        }
        sendResponse({ ok: true, registeredMatches: result.registeredMatches, injected });
      })();
      return true;
    }

    return false;
  });
})();
