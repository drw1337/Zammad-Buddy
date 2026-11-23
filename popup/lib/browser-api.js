/**
 * Buddy for Zammad – Browser API wrapper for the popup.
 *
 * Hides the differences between Chrome (`chrome.*`) and Firefox (`browser.*`)
 * and degrades gracefully when the popup is opened as a plain file in the
 * offline sandbox, where no extension APIs exist.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const popup = (ns.popup = ns.popup || {});

  const ext =
    typeof browser !== 'undefined' && browser.runtime
      ? browser
      : typeof chrome !== 'undefined' && chrome.runtime
        ? chrome
        : null;

  const SYNC_MESSAGE = 'zb:sync-instances';

  async function hasOriginPermission(matchPattern) {
    if (!ext || !ext.permissions || !ext.permissions.contains) return true;
    try {
      return await ext.permissions.contains({ origins: [matchPattern] });
    } catch (_) {
      return false;
    }
  }

  /** Must be called directly from a user gesture (click / submit). */
  function requestOriginPermission(matchPattern) {
    if (!ext || !ext.permissions || !ext.permissions.request) return Promise.resolve(true);
    return ext.permissions.request({ origins: [matchPattern] });
  }

  async function removeOriginPermission(matchPattern) {
    if (!ext || !ext.permissions || !ext.permissions.remove) return;
    try {
      await ext.permissions.remove({ origins: [matchPattern] });
    } catch (_) {
      // The permission may already be gone.
    }
  }

  /**
   * The active tab and – if its URL looks like a web app – the parsed instance.
   * @returns {Promise<{ id: number | null, parsed: object | null }>}
   */
  async function detectActiveTab() {
    if (!ext || !ext.tabs || !ext.tabs.query) return { id: null, parsed: null };
    try {
      const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return { id: tab ? tab.id : null, parsed: null };
      const parsed = ns.storage.parseInstanceInput(tab.url);
      return { id: tab.id, parsed: parsed.ok ? parsed : null };
    } catch (_) {
      return { id: null, parsed: null };
    }
  }

  /** Asks the background script to re-register content scripts (and inject into a tab). */
  function requestBackgroundSync(injectTabId) {
    if (!ext || !ext.runtime || !ext.runtime.sendMessage) return;
    try {
      ext.runtime.sendMessage({
        type: SYNC_MESSAGE,
        injectTabId: typeof injectTabId === 'number' ? injectTabId : undefined,
      });
    } catch (_) {
      // Not available in the offline sandbox.
    }
  }

  function extensionVersion() {
    if (!ext || !ext.runtime || !ext.runtime.getManifest) return null;
    const manifest = ext.runtime.getManifest();
    return manifest && manifest.version ? manifest.version : null;
  }

  popup.browserApi = {
    SYNC_MESSAGE,
    hasOriginPermission,
    requestOriginPermission,
    removeOriginPermission,
    detectActiveTab,
    requestBackgroundSync,
    extensionVersion,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
