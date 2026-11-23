/**
 * Buddy for Zammad – Toolbar icons.
 *
 * Static, hand-drawn 16x16 SVG strings that inherit `currentColor`. They are
 * constants of this extension and never contain user input, so assigning them
 * via `ZammadBuddy.safeHtml` is safe.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const ui = (ns.wysiwygUi = ns.wysiwygUi || {});

  const ICONS = Object.freeze({
    bold: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5h4.2a2.8 2.8 0 0 1 0 5.5H4.5V2.5z"/><path d="M4.5 8h4.8a2.8 2.8 0 0 1 0 5.5H4.5V8z"/></svg>',
    italic:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 2.5h5M4.5 13.5h5M9.5 2.5l-3 11"/></svg>',
    underline:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4.5 2.5v5a3.5 3.5 0 0 0 7 0v-5M3.5 13.5h9"/></svg>',
    strike:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M2.5 8h11"/><path d="M10.8 4.6C10.4 3.5 9.3 2.8 7.9 2.8c-1.8 0-3.1.9-3.1 2.3 0 1.2.9 1.9 2.6 2.3"/><path d="M5 11.2c.4 1.2 1.6 2 3.2 2 1.9 0 3.2-1 3.2-2.4 0-.9-.5-1.6-1.5-2"/></svg>',
    ul: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="3" cy="4" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M6 4h7.5M6 8h7.5M6 12h7.5"/></svg>',
    ol: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"><path d="M6.5 4h7M6.5 8h7M6.5 12h7"/><path d="M2.5 3.2h1v2.6M2 5.8h2M2.1 8.5c.3-.5 1.4-.5 1.6.1.2.5-.3 1-.9 1.4l-.8.6h1.9" stroke-width="1.35"/></svg>',
    indent:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.5h11M8.5 7h5M8.5 10.5h5M2.5 13.5h11"/><path d="M2.5 6.5l3 2.2-3 2.2"/></svg>',
    outdent:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.5h11M8.5 7h5M8.5 10.5h5M2.5 13.5h11"/><path d="M5.5 6.5l-3 2.2 3 2.2"/></svg>',
    quote:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3.5v9M6.5 5h6.5M6.5 8h5M6.5 11h6"/></svg>',
    hr: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 8h12"/><path d="M5 4.5h6M5 11.5h6" stroke-opacity="0.38" stroke-width="1.3"/></svg>',
    code: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5.2 4.8L2 8l3.2 3.2M10.8 4.8L14 8l-3.2 3.2"/></svg>',
    codeBlock:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="2"/><path d="M5.2 6.2L3.6 8l1.6 1.8M8.2 10h3.5"/></svg>',
    link: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2L7.7 4.1"/><path d="M9.2 6.8a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1.1-1.1"/></svg>',
    table:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="1.6"/><path d="M2 6.2h12M2 9.8h12M6 6.2v7.3M10 6.2v7.3"/></svg>',
    emoji:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><circle cx="6" cy="6.6" r="0.7" fill="currentColor" stroke="none"/><circle cx="10" cy="6.6" r="0.7" fill="currentColor" stroke="none"/><path d="M5.5 9.6c.6 1.1 1.5 1.6 2.5 1.6s1.9-.5 2.5-1.6"/></svg>',
    highlight:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.8 2.6l3.6 3.6-5.6 5.6H4.2V8.2l5.6-5.6z"/><path d="M2.5 14h11" stroke-width="2.1"/></svg>',
    clearFormat:
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3.5h8M7 3.5l-2.2 9"/><path d="M10.2 9.2l3.3 3.3M13.5 9.2l-3.3 3.3"/></svg>',
    preview:
      '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>',
    lock: '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.2" width="10" height="6.8" rx="1.5"/><path d="M5.2 7.2V5a2.8 2.8 0 0 1 5.6 0v2.2"/></svg>',
    mail: '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3.2" width="12" height="9.6" rx="1.5"/><path d="M2.4 4l5.6 4.2L13.6 4"/></svg>',
  });

  ui.icons = ICONS;
})(typeof globalThis !== 'undefined' ? globalThis : window);
