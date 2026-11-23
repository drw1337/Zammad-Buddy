/**
 * Buddy for Zammad – Element builders for the advanced search panel.
 *
 * Texts are attached as `data-i18n*` attributes and translated in one pass via
 * `ZammadBuddy.i18n.translateDom`, so switching the language never needs a
 * hand-written list of every label.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.searchPanelParts = ns.searchPanelParts || {});

  let idCounter = 0;

  function createKit(doc) {
    /**
     * @param {string} tag
     * @param {{ className?: string, i18n?: string, placeholder?: string, title?: string, type?: string }} [opts]
     */
    function el(tag, opts) {
      const o = opts || {};
      const node = doc.createElement(tag);
      if (o.className) node.className = o.className;
      if (o.type) node.type = o.type;
      if (o.i18n) node.setAttribute('data-i18n', o.i18n);
      if (o.placeholder) node.setAttribute('data-i18n-placeholder', o.placeholder);
      if (o.title) node.setAttribute('data-i18n-title', o.title);
      return node;
    }

    function button(className, i18nKey) {
      return el('button', { type: 'button', className, i18n: i18nKey });
    }

    function textInput(placeholderKey, extraClass) {
      const input = el('input', {
        type: 'text',
        className: `zb-field${extraClass ? ` ${extraClass}` : ''}`,
        placeholder: placeholderKey,
      });
      input.autocomplete = 'off';
      return input;
    }

    /** @param {{ value: string, key: string }[]} defs */
    function select(className, defs) {
      const sel = el('select', { className });
      for (const def of defs) {
        const opt = el('option', { i18n: def.key });
        opt.value = def.value;
        sel.appendChild(opt);
      }
      return sel;
    }

    /** `.zb-group` with a `<label for>` bound to `control` (or its first form control). */
    function group(labelKey, control) {
      const wrap = el('div', { className: 'zb-group' });
      const label = el('label', { className: 'zb-label', i18n: labelKey });
      const target =
        control.matches && control.matches('input, select, textarea')
          ? control
          : control.querySelector('input, select, textarea');
      if (target) {
        idCounter += 1;
        target.id = target.id || `zb-search-field-${idCounter}`;
        label.htmlFor = target.id;
      }
      wrap.appendChild(label);
      wrap.appendChild(control);
      return wrap;
    }

    function row(className, children) {
      const node = el('div', { className });
      for (const child of children) node.appendChild(child);
      return node;
    }

    /**
     * Segmented buttons; `onSelect(value)` fires on click.
     * @returns {{ element: HTMLElement, setActive(value: string): void }}
     */
    function segments(defs, onSelect) {
      const wrap = el('div', { className: 'zb-seg-wrap' });
      wrap.setAttribute('role', 'group');
      const buttons = defs.map((def) => {
        const btn = button('zb-seg-btn', def.key);
        btn.dataset.value = def.value;
        btn.addEventListener('click', () => onSelect(def.value));
        wrap.appendChild(btn);
        return btn;
      });
      return {
        element: wrap,
        setActive(value) {
          for (const btn of buttons) {
            const active = btn.dataset.value === value;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', String(active));
          }
        },
      };
    }

    return { el, button, textInput, select, group, row, segments };
  }

  parts.createKit = createKit;
})(typeof globalThis !== 'undefined' ? globalThis : window);
