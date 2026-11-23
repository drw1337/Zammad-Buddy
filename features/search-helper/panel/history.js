/**
 * Buddy for Zammad – Search history of the advanced search panel.
 *
 * The last searches (see `storage.pushSearchHistory`, max. 12, stored locally
 * only) open as a compact list below the title bar. Clicking an entry loads it
 * into the query field; nothing is searched until the agent confirms.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.searchPanelParts = ns.searchPanelParts || {});

  const CLOCK_ICON =
    '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.6 8a5.4 5.4 0 1 0 1.6-3.8"/><path d="M2.4 2.6v2.2h2.2"/><path d="M8 5v3.2l2 1.3"/></svg>';

  function relativeTime(at, lang) {
    if (!at) return '';
    const minutes = Math.round((Date.now() - at) / 60000);
    try {
      const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' });
      if (minutes < 60) return rtf.format(-minutes, 'minute');
      if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), 'hour');
      return rtf.format(-Math.round(minutes / 1440), 'day');
    } catch (_) {
      return '';
    }
  }

  /**
   * @param {ReturnType<typeof parts.createKit>} kit
   * @param {{ getSettings: () => object, lang: () => string, onApply: (query: string) => void }} options
   */
  function createHistory(kit, options) {
    const toggle = kit.el('button', {
      type: 'button',
      className: 'zb-icon-btn',
      title: 'searchHistoryTitle',
    });
    ns.safeHtml.setHtml(toggle, CLOCK_ICON);
    toggle.setAttribute('data-i18n-aria-label', 'searchHistoryTitle');
    toggle.setAttribute('aria-expanded', 'false');

    const panel = kit.el('div', { className: 'zb-history' });
    panel.hidden = true;
    const head = kit.row('zb-history-head', [
      kit.el('span', { className: 'zb-label', i18n: 'searchHistoryTitle' }),
    ]);
    const clearBtn = kit.button('zb-text-link', 'searchHistoryClear');
    head.appendChild(clearBtn);
    const list = kit.el('ul', { className: 'zb-history-list' });
    const empty = kit.el('p', { className: 'zb-history-empty', i18n: 'searchHistoryEmpty' });
    panel.append(head, list, empty);

    function setOpen(open) {
      panel.hidden = !open;
      toggle.classList.toggle('is-active', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) render();
    }

    function render() {
      const items = (options.getSettings() || {}).searchHistory || [];
      list.textContent = '';
      empty.hidden = items.length > 0;
      clearBtn.hidden = items.length === 0;
      for (const item of items) {
        const li = kit.el('li');
        const btn = kit.el('button', { type: 'button', className: 'zb-history-item' });
        const query = kit.el('span', { className: 'zb-history-query' });
        query.textContent = item.query;
        const when = kit.el('span', { className: 'zb-history-when' });
        when.textContent = relativeTime(item.at, options.lang());
        btn.title = item.query;
        btn.append(query, when);
        btn.addEventListener('click', () => {
          setOpen(false);
          options.onApply(item.query);
        });
        li.appendChild(btn);
        list.appendChild(li);
      }
    }

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    clearBtn.addEventListener('click', async () => {
      if (ns.storage) await ns.storage.saveSettings({ searchHistory: [] });
      render();
    });

    return { toggle, element: panel, render: () => !panel.hidden && render(), close: () => setOpen(false) };
  }

  parts.createHistory = createHistory;
})(typeof globalThis !== 'undefined' ? globalThis : window);
