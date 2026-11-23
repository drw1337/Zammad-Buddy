/**
 * Buddy for Zammad – Translation lookup (English default + German).
 *
 * The texts live in `./locales/<lang>.js`; this file only resolves keys,
 * fills `{placeholders}` and translates `data-i18n*` attributes in the DOM.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const locales = ns.locales || {};
  const MESSAGES = {
    en: locales.en || (isNode ? require('./locales/en.js') : {}),
    de: locales.de || (isNode ? require('./locales/de.js') : {}),
  };

  function normalizeLang(lang) {
    return lang === 'de' ? 'de' : 'en';
  }

  function t(lang, key, params) {
    const code = normalizeLang(lang);
    const dict = MESSAGES[code] || MESSAGES.en;
    let template = dict[key] !== undefined ? dict[key] : MESSAGES.en[key] || key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return template;
  }

  function translateCategories(lang, categoryKeys) {
    if (!Array.isArray(categoryKeys)) return '';
    return categoryKeys.map((k) => t(lang, `cat_${k}`)).join(', ');
  }

  /** Attribute -> what it translates. Keys are read from the attribute value. */
  const DOM_BINDINGS = Object.freeze([
    ['data-i18n', (el, text) => (el.textContent = text)],
    ['data-i18n-placeholder', (el, text) => (el.placeholder = text)],
    ['data-i18n-title', (el, text) => (el.title = text)],
    ['data-i18n-aria-label', (el, text) => el.setAttribute('aria-label', text)],
  ]);

  /**
   * Translates every element below `rootEl` (inclusive) that carries one of the
   * `data-i18n*` attributes, e.g. `<span data-i18n="tabSettings">`.
   * @param {Element} rootEl
   * @param {string} lang
   */
  function translateDom(rootEl, lang) {
    if (!rootEl || typeof rootEl.querySelectorAll !== 'function') return;
    for (const [attr, apply] of DOM_BINDINGS) {
      const nodes = Array.from(rootEl.querySelectorAll(`[${attr}]`));
      if (rootEl.hasAttribute && rootEl.hasAttribute(attr)) nodes.unshift(rootEl);
      for (const el of nodes) apply(el, t(lang, el.getAttribute(attr)));
    }
  }

  const api = { MESSAGES, normalizeLang, t, translateCategories, translateDom };
  ns.i18n = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
