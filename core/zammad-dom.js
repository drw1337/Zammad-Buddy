/**
 * Buddy for Zammad – Everything this extension assumes about Zammad's DOM.
 *
 * All Zammad-specific selectors live here, so an interface change in Zammad
 * (for example its new desktop view) needs an update in one place only.
 * `[data-zb-mock-*]` entries belong to the offline sandbox in test/.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const isNode = typeof module !== 'undefined' && module.exports;

  const SELECTORS = Object.freeze({
    /** Rich text editors in replies, notes and new tickets. */
    editor: [
      '.article-add [data-name="body"][contenteditable]',
      '.ticket-create [data-name="body"][contenteditable]',
      '.richtext.form-control [data-name="body"][contenteditable]',
      '.richtext-content[data-name="body"][contenteditable]',
    ].join(', '),

    /** Classes of the element that wraps one editor with its article settings. */
    articleContainerClasses: Object.freeze(['article-add', 'ticket-create', 'article-new']),

    /** Search field in the top-left navigation. */
    sidebarSearch: [
      '#global-search',
      '.navigation .search input',
      '.menu-item-search input',
      '[data-zb-mock-search]',
    ].join(', '),

    /** Wrapper around the sidebar search that reacts to focus (QuickSearch). */
    sidebarSearchWrapper: 'label, form, .search, .menu-item-search, [class*="QuickSearch"]',

    /** Search input on Zammad's search results page. */
    searchPageInput: 'input.js-search',

    /** Main content area (used to detect a dark content theme). */
    contentPane: '#app .content, .main, #main',

    /** Open `::` text module or `@` mention menu – they own the Tab key while open. */
    autocompleteOpen:
      '.textcomplete-dropdown:not([style*="display: none"]), .atwho-view[style*="display: block"]',
  });

  /** Relative luminance threshold below which a background counts as dark. */
  const DARK_LUMINANCE = 90;

  /**
   * Whether Zammad's main content area is dark. Default Zammad has a dark
   * sidebar but a light content area, so the sidebar alone does not count.
   */
  function isDarkMode(doc) {
    const d = doc || root.document;
    if (!d || !d.documentElement) return false;
    const html = d.documentElement;
    if (
      html.getAttribute('data-theme') === 'dark' ||
      (d.body && d.body.getAttribute('data-theme') === 'dark') ||
      html.classList.contains('dark')
    ) {
      return true;
    }
    const pane = d.querySelector(SELECTORS.contentPane);
    const view = d.defaultView || root;
    if (!pane || typeof view.getComputedStyle !== 'function') return false;
    const m = String(view.getComputedStyle(pane).backgroundColor).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    const lum = (Number(m[1]) * 299 + Number(m[2]) * 587 + Number(m[3]) * 114) / 1000;
    return lum > 0 && lum < DARK_LUMINANCE;
  }

  const api = { SELECTORS, isDarkMode };

  ns.zammadDom = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
