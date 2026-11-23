/**
 * Buddy for Zammad – Saved search presets of the advanced search panel.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.searchPanelParts = ns.searchPanelParts || {});

  async function updateSavedSearches(transform) {
    if (!ns.storage) return;
    const current = await ns.storage.loadSettings();
    const list = Array.isArray(current.savedSearches) ? current.savedSearches : [];
    await ns.storage.saveSettings({ savedSearches: transform(list) });
  }

  /** Persists a new preset. */
  function savePreset(label, query) {
    return updateSavedSearches((list) => list.concat([{ id: `${Date.now()}`, label, query }]));
  }

  function deletePreset(id) {
    return updateSavedSearches((list) => list.filter((item) => item.id !== id));
  }

  /**
   * Strip of saved presets above the form; hidden while there are none.
   * @param {ReturnType<typeof parts.createKit>} kit
   * @param {{ getSettings: () => object, onApply: (query: string) => void, onChanged: () => void }} options
   */
  function createPresetStrip(kit, options) {
    const strip = kit.el('div', { className: 'zb-fav-strip' });
    const items = kit.el('span');
    items.style.display = 'contents';
    strip.appendChild(kit.el('span', { className: 'zb-fav-label', i18n: 'searchSavedLabel' }));
    strip.appendChild(items);

    function render() {
      const settings = options.getSettings() || {};
      const presets = Array.isArray(settings.savedSearches) ? settings.savedSearches : [];
      items.textContent = '';
      strip.hidden = presets.length === 0;

      for (const preset of presets) {
        const item = kit.el('span', { className: 'zb-fav-item' });

        const runBtn = kit.el('button', { type: 'button', className: 'zb-fav-run' });
        runBtn.textContent = preset.label;
        runBtn.title = preset.query;
        runBtn.addEventListener('click', () => options.onApply(preset.query));

        const delBtn = kit.el('button', {
          type: 'button',
          className: 'zb-fav-del',
          title: 'searchDeletePreset',
        });
        delBtn.textContent = '×';
        delBtn.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          await deletePreset(preset.id);
          options.onChanged();
        });

        item.appendChild(runBtn);
        item.appendChild(delBtn);
        items.appendChild(item);
      }
    }

    return { element: strip, render };
  }

  parts.createPresetStrip = createPresetStrip;
  parts.savePreset = savePreset;
})(typeof globalThis !== 'undefined' ? globalThis : window);
