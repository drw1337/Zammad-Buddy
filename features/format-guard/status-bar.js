/**
 * Buddy for Zammad – Format Guard status bar above the editor.
 *
 * Three states: clean, warning (hidden formatting found, with color swatches
 * and a "Clean up" button) and a short confirmation after a cleanup.
 * Buttons: clean up, paste cleanup on / off-once, toolbar toggle (`Aa`).
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.formatGuardParts = ns.formatGuardParts || {});

  function show(el, visible) {
    el.style.display = visible ? '' : 'none';
  }

  /**
   * @param {Document} doc
   * @param {{ onClean: () => void, onTogglePasteCleanup: () => void, onToggleToolbar: () => void }} handlers
   */
  function createStatusBar(doc, handlers) {
    const el = (tag, className) => {
      const node = doc.createElement(tag);
      node.className = className;
      return node;
    };
    const button = (className, onClick) => {
      const btn = el('button', className);
      btn.type = 'button';
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onClick();
      });
      return btn;
    };

    const bar = el('div', 'zb-format-bar is-clean');
    bar.setAttribute('data-zb-ui', 'format-bar');
    bar.setAttribute('role', 'status');
    // Clicks on the bar must not reach Zammad's article handlers.
    bar.addEventListener('click', (ev) => ev.stopPropagation());
    bar.addEventListener('mousedown', (ev) => ev.stopPropagation());

    const status = el('div', 'zb-status');
    const statusText = el('span', 'zb-status-text');
    const swatches = el('span', 'zb-color-swatches');
    status.append(el('span', 'zb-dot'), statusText, swatches);

    const cleanBtn = button('zb-btn zb-btn--clean', handlers.onClean);
    const pasteBtn = button('zb-btn zb-btn--toggle', handlers.onTogglePasteCleanup);
    const toolbarBtn = button('zb-btn zb-btn--wysiwyg-toggle', handlers.onToggleToolbar);
    const actions = el('div', 'zb-actions');
    actions.append(cleanBtn, pasteBtn, toolbarBtn);
    bar.append(status, actions);

    function setMode(mode) {
      bar.classList.toggle('is-clean', mode === 'clean');
      bar.classList.toggle('is-warning', mode === 'warning');
      bar.classList.toggle('is-toast', mode === 'toast');
      show(cleanBtn, mode === 'warning');
    }

    function renderButtons(settings, t, skipNextPaste) {
      cleanBtn.textContent = t('barCleanBtn');
      cleanBtn.title = t('barCleanBtnTitle');

      const pasteState = skipNextPaste ? 'once' : settings.autoCleanPaste !== false ? 'on' : 'off';
      const pasteTexts = {
        once: ['barBypassOnce', 'barBypassOnceTitle'],
        on: ['barAutoOn', 'barAutoOnTitle'],
        off: ['barAutoOff', 'barAutoOffTitle'],
      }[pasteState];
      pasteBtn.textContent = t(pasteTexts[0]);
      pasteBtn.title = t(pasteTexts[1]);
      pasteBtn.classList.toggle('is-active', pasteState === 'on');
      pasteBtn.classList.toggle('is-paused', pasteState !== 'on');

      show(toolbarBtn, settings.wysiwygEnabled !== false);
      const collapsed = Boolean(settings.wysiwygCollapsed);
      toolbarBtn.textContent = `${t('barToggleWysiwyg')} ${collapsed ? '▸' : '▾'}`;
      toolbarBtn.title = t(collapsed ? 'barToggleWysiwygShowTitle' : 'barToggleWysiwygHideTitle');
      toolbarBtn.setAttribute('aria-expanded', String(!collapsed));
      toolbarBtn.classList.toggle('is-open', !collapsed);
    }

    /**
     * @param {{ settings: object, t: Function, categories: (keys: string[]) => string,
     *           report: { count: number, categories: string[], colorSamples: string[] },
     *           toast: { key: string, params?: object } | null, skipNextPaste: boolean }} state
     */
    function render(state) {
      const { settings, t, report, toast } = state;
      if (settings.enabled === false) {
        show(bar, false);
        return;
      }
      show(bar, true);
      renderButtons(settings, t, state.skipNextPaste);
      swatches.textContent = '';

      if (report.count > 0) {
        setMode('warning');
        const cats = state.categories(report.categories);
        const label =
          report.count === 1
            ? t('barWarningOne', { cats })
            : t('barWarningMany', { count: report.count, cats });
        statusText.textContent = label;
        status.title = t('barWarningHint', { label });
        for (const color of report.colorSamples) {
          const swatch = el('span', 'zb-swatch');
          swatch.style.backgroundColor = color;
          swatch.title = t('barSwatchTitle', { color });
          swatches.appendChild(swatch);
        }
      } else if (toast) {
        setMode('toast');
        const params = Object.assign({}, toast.params);
        if (Array.isArray(params.categoryKeys)) params.cats = state.categories(params.categoryKeys);
        statusText.textContent = t(toast.key, params);
        status.title = statusText.textContent;
      } else {
        setMode('clean');
        statusText.textContent = t('barClean');
        status.title = t('barCleanHint');
      }
    }

    return { element: bar, render };
  }

  parts.createStatusBar = createStatusBar;
})(typeof globalThis !== 'undefined' ? globalThis : window);
