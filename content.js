/**
 * Buddy for Zammad – Content Script Entry Point.
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ZammadBuddy = root.ZammadBuddy;
  if (!ZammadBuddy || !ZammadBuddy.storage || !ZammadBuddy.observer) {
    return;
  }

  if (ZammadBuddy._started) return;
  ZammadBuddy._started = true;

  async function init() {
    const settings = await ZammadBuddy.storage.loadSettings();
    ZammadBuddy.observer.start(settings);

    ZammadBuddy.storage.onSettingsChanged((nextSettings) => {
      ZammadBuddy.observer.updateSettings(nextSettings);
    });
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
