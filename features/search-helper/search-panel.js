/**
 * Buddy for Zammad – Advanced ticket search panel (Light DOM).
 *
 * Composes the panel parts in `./panel/` into the flyout `#zbSearchFlyout`:
 * header, saved presets, filter form, optional syntax drawer and footer.
 * Real Light-DOM `<input>` / `<select>` elements keep normal keyboard focus;
 * key and click events are stopped here so Zammad's global shortcuts never
 * see them.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = ns.searchPanelParts || {};

  const RESET_ICON =
    '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 6h11"/><path d="M6 9.5h4"/></svg>';

  /**
   * @param {HTMLElement} containerEl
   * @param {{
   *   doc?: Document,
   *   getSettings: () => object,
   *   onExecuteSearch: (query: string) => void,
   *   onRequestClose?: () => void,
   *   onResetPosition?: () => void
   * }} callbacks
   * @returns {{ refresh(): void, focusFirst(): void, destroy(): void }}
   */
  function mountSearchBuilder(containerEl, callbacks) {
    const doc = callbacks.doc || containerEl.ownerDocument || root.document;
    const kit = parts.createKit(doc);
    const lang = () => ((callbacks.getSettings && callbacks.getSettings()) || {}).language || 'en';
    const t = (key, params) => (ns.i18n ? ns.i18n.t(lang(), key, params) : key);
    const requestClose = () => callbacks.onRequestClose && callbacks.onRequestClose();

    let manualQuery = false;

    // ---- Parts -------------------------------------------------------------

    const filters = parts.createFilters(kit, { t, onChange: recompute });
    const drawer = parts.createSyntaxDrawer(kit, {
      t,
      onManualEdit() {
        manualQuery = true;
        syncRunButton();
      },
      onPresetSaved: refresh,
    });
    const presets = parts.createPresetStrip(kit, {
      getSettings: () => callbacks.getSettings() || {},
      onApply: (query) => applyQuery(query),
      onChanged: refresh,
    });
    const applyQuery = (query) => {
      setDrawerOpen(true);
      manualQuery = true;
      drawer.setQuery(query);
      syncRunButton();
    };
    const history = parts.createHistory(kit, {
      getSettings: () => callbacks.getSettings() || {},
      lang,
      onApply: applyQuery,
    });

    // ---- Layout ------------------------------------------------------------

    const btnClose = kit.el('button', { type: 'button', className: 'zb-close-btn', title: 'popCloseTitle' });
    btnClose.textContent = '×';
    btnClose.setAttribute('data-i18n-aria-label', 'popCloseTitle');
    btnClose.addEventListener('click', requestClose);
    const btnResetPosition = kit.el('button', {
      type: 'button',
      className: 'zb-icon-btn',
      title: 'resetPositionTitle',
    });
    ns.safeHtml.setHtml(btnResetPosition, RESET_ICON);
    btnResetPosition.setAttribute('data-i18n-aria-label', 'resetPositionTitle');
    btnResetPosition.hidden = true;
    btnResetPosition.addEventListener(
      'click',
      () => callbacks.onResetPosition && callbacks.onResetPosition()
    );
    const title = kit.el('h3', { className: 'zb-head-title', i18n: 'inPageSearchHeading' });
    title.setAttribute('data-i18n-title', 'moveHint');
    const head = kit.row('zb-head', [
      title,
      kit.row('zb-head-actions', [history.toggle, btnResetPosition, btnClose]),
    ]);

    const body = kit.row('zb-body', [presets.element, ...filters.elements]);

    const btnToggleSyntax = kit.button('zb-text-link', 'searchToggleSyntax');
    btnToggleSyntax.addEventListener('click', () => setDrawerOpen(!drawer.isOpen()));
    const btnReset = kit.button('zb-btn-sec', 'searchResetBtn');
    const btnRun = kit.button('zb-btn-primary', 'searchRunBtn');
    const foot = kit.row('zb-foot', [btnToggleSyntax, kit.row('zb-foot-right', [btnReset, btnRun])]);

    containerEl.setAttribute('role', 'dialog');
    containerEl.setAttribute('data-i18n-aria-label', 'inPageSearchHeading');
    for (const node of [head, history.element, body, drawer.element, foot]) containerEl.appendChild(node);

    // ---- Behavior ----------------------------------------------------------

    function setDrawerOpen(open) {
      drawer.setOpen(open);
      btnToggleSyntax.classList.toggle('is-open', open);
      btnToggleSyntax.setAttribute('aria-expanded', String(open));
    }

    function syncRunButton() {
      btnRun.disabled = !drawer.getQuery();
    }

    /** Recompiles the query from the form; overrides manual edits on purpose. */
    function recompute() {
      manualQuery = false;
      filters.updateMoreBadge();
      drawer.setQuery(ns.searchQuery ? ns.searchQuery.buildZammadQuery(filters.getValues()) : '');
      syncRunButton();
    }

    function run() {
      const query = drawer.getQuery();
      if (!query) return;
      if (ns.storage) ns.storage.pushSearchHistory(query);
      if (callbacks.onExecuteSearch) callbacks.onExecuteSearch(query);
    }

    btnRun.addEventListener('click', run);
    btnReset.addEventListener('click', () => {
      filters.reset();
      recompute();
      filters.focusFirst();
    });

    // Shield Zammad's global listeners; Enter runs the search, Escape closes.
    function shieldKeys(ev) {
      if (ev.type === 'keydown' && ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        requestClose();
        return;
      }
      const target = ev.target;
      const enterRuns =
        ev.type === 'keydown' &&
        ev.key === 'Enter' &&
        target !== drawer.nameInput &&
        target.tagName !== 'SUMMARY' &&
        target.tagName !== 'BUTTON';
      if (enterRuns) {
        ev.preventDefault();
        run();
      }
      ev.stopPropagation();
    }

    containerEl.addEventListener('keydown', shieldKeys);
    containerEl.addEventListener('keypress', shieldKeys);
    containerEl.addEventListener('keyup', shieldKeys);
    containerEl.addEventListener('click', (ev) => ev.stopPropagation());

    /** Re-applies texts (language switch) and saved presets. */
    function refresh() {
      if (ns.i18n) ns.i18n.translateDom(containerEl, lang());
      presets.render();
      history.render();
      filters.updateMoreBadge();
      if (!manualQuery) recompute();
    }

    refresh();

    return {
      refresh,
      focusFirst: filters.focusFirst,
      /** Title bar, used by the host as drag handle. */
      dragHandle: head,
      /** Shows the reset button while the flyout sits at a custom position. */
      setMoved(moved) {
        btnResetPosition.hidden = !moved;
      },
      destroy() {
        drawer.destroy();
        containerEl.textContent = '';
      },
    };
  }

  ns.searchPanel = { mountSearchBuilder };
})(typeof globalThis !== 'undefined' ? globalThis : window);
