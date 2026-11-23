/**
 * Buddy for Zammad – Popup entry point.
 *
 * Holds the popup state (settings, active tab), wires the language switch and
 * the two tabs (`lib/settings-tab.js`, `lib/instances-tab.js`) and re-renders
 * whenever settings change – also when they change in another window.
 * The popup follows the browser's light / dark color scheme.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = root.ZammadBuddy;
  const { i18n, storage } = ns;
  const { browserApi, createSettingsTab, createInstancesTab } = ns.popup;
  const doc = root.document;

  // Apply the color scheme before the first paint.
  const darkQuery = root.matchMedia ? root.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyColorScheme() {
    doc.documentElement.dataset.theme = darkQuery && darkQuery.matches ? 'dark' : 'light';
  }
  applyColorScheme();
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', applyColorScheme);

  let settings = {};
  let activeTab = { id: null, parsed: null };

  const lang = () => settings.language || 'en';
  const t = (key, params) => i18n.t(lang(), key, params);

  const langButtons = Array.from(doc.querySelectorAll('.lang-btn'));
  const tabButtons = Array.from(doc.querySelectorAll('.popup-tab'));
  const panels = {
    settings: doc.getElementById('panelSettings'),
    instances: doc.getElementById('panelInstances'),
  };

  function switchTab(name) {
    const active = name === 'instances' ? 'instances' : 'settings';
    for (const btn of tabButtons) {
      const selected = btn.dataset.tab === active;
      btn.classList.toggle('is-active', selected);
      btn.setAttribute('aria-selected', String(selected));
    }
    for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== active;
  }

  const app = {
    getSettings: () => settings,
    setSettings(next) {
      settings = next;
    },
    getActiveTab: () => activeTab,
    t,
    switchTab,
    async save(patch) {
      settings = await storage.saveSettings(patch);
      await render();
    },
    render: () => render(),
  };

  const settingsTab = createSettingsTab(doc, app);
  const instancesTab = createInstancesTab(doc, app);

  async function render() {
    doc.documentElement.lang = lang();
    i18n.translateDom(doc.body, lang());
    for (const btn of langButtons) {
      const active = btn.dataset.lang === lang();
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    const cleaned = (settings.stats && settings.stats.cleanedCount) || 0;
    doc.getElementById('txtStats').textContent =
      cleaned > 0 ? t('statsCleaned', { count: cleaned }) : t('statsZero');

    settingsTab.render();
    await instancesTab.render();
  }

  async function init() {
    const version = browserApi.extensionVersion();
    if (version) doc.getElementById('versionLabel').textContent = `v${version}`;

    settings = await storage.loadSettings();
    activeTab = await browserApi.detectActiveTab();

    // Without a connected instance the "Instances" tab is the useful first view.
    switchTab(instancesTab.hasInstances() ? 'settings' : 'instances');

    for (const btn of tabButtons) btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    for (const btn of langButtons) {
      btn.addEventListener('click', () => app.save({ language: btn.dataset.lang === 'de' ? 'de' : 'en' }));
    }

    storage.onSettingsChanged(async (next) => {
      settings = next;
      await render();
    });

    await render();
  }

  doc.addEventListener('DOMContentLoaded', init);
})(typeof globalThis !== 'undefined' ? globalThis : window);
