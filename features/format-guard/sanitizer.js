/**
 * Buddy for Zammad – Format Guard sanitizer (facade).
 *
 * Strips invisible or unwanted inline colors, backgrounds, font families,
 * font sizes and MS Office artifacts while preserving semantic formatting
 * (bold, italic, underline, links, lists, tables, code, line breaks, images),
 * Zammad signatures (div[data-signature]) and intentional highlight markers
 * inside internal notes.
 *
 * Parts in `./sanitizer/`:
 *   rules.js     allow-lists, palettes, protected elements, URL checks
 *   detector.js  finds hidden formatting and reports categories
 *   cleaner.js   cleans a DOM subtree in place
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = ns.sanitizerParts || {};
  const isNode = typeof module !== 'undefined' && module.exports;
  const rules = parts.rules || (isNode ? require('./sanitizer/rules.js') : null);
  const detector = parts.detector || (isNode ? require('./sanitizer/detector.js') : null);
  const cleaner = parts.cleaner || (isNode ? require('./sanitizer/cleaner.js') : null);

  if (!rules || !detector || !cleaner) {
    throw new Error('[Buddy for Zammad] Sanitizer parts not loaded');
  }

  function escapePlainTextToHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/\r\n?/g, '\n')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  /**
   * Cleans clipboard HTML before it is inserted into the editor.
   * @param {string} html clipboard `text/html`
   * @param {string} plainText clipboard `text/plain` (fallback)
   * @param {{ DOMParser?: typeof DOMParser, isInternal?: boolean, preserveBlockquotes?: boolean }} [options]
   * @returns {{ html: string, hadHiddenFormatting: boolean, cleanedCount: number, detectedCategories: string[] }}
   */
  function cleanPastedHtml(html, plainText, options) {
    const opts = options || {};
    const ParserCtor = opts.DOMParser || root.DOMParser;
    if (!html || !String(html).trim() || !ParserCtor) {
      return {
        html: escapePlainTextToHtml(plainText || ''),
        hadHiddenFormatting: false,
        cleanedCount: 0,
        detectedCategories: [],
      };
    }

    const input = String(html).replace(/<!--(Start|End)Fragment-->/gi, '');
    const doc = new ParserCtor().parseFromString(input, 'text/html');
    const body = doc.body;

    const preReport = detector.detectHiddenFormatting(body, opts);
    const cleanedCount = cleaner.sanitizeSubtree(doc, body, opts);

    // Unwrap single-line block wrappers (such as Outlook <p class="MsoNormal">word</p>)
    // so inline pastes do not break the current sentence onto a new line.
    const isSingleLinePlain =
      typeof plainText === 'string' && plainText.length > 0 && !/[\r\n]/.test(plainText.trim());
    const only = body.children.length === 1 ? body.firstElementChild : null;
    if (
      isSingleLinePlain &&
      only &&
      (only.tagName === 'P' || only.tagName === 'DIV') &&
      !only.querySelector('br, p, div, ul, ol, table, pre, blockquote, hr')
    ) {
      cleaner.unwrapElement(only);
    }

    let resultHtml = body.innerHTML.trim();
    if (!resultHtml && plainText) resultHtml = escapePlainTextToHtml(plainText);

    return {
      html: resultHtml,
      hadHiddenFormatting: preReport.count > 0 || cleanedCount > 0,
      cleanedCount: Math.max(preReport.count, cleanedCount),
      detectedCategories: preReport.categories,
    };
  }

  /** Cleans the live editor in place ("Clean up" button). */
  function cleanEditorDom(editorEl, options) {
    if (!editorEl) return { cleanedCount: 0 };
    const doc = editorEl.ownerDocument || root.document;
    const before = detector.detectHiddenFormatting(editorEl, options);
    const changes = cleaner.sanitizeSubtree(doc, editorEl, options);
    return { cleanedCount: Math.max(before.count, changes) };
  }

  const api = {
    NOTE_HIGHLIGHT_PALETTE: rules.NOTE_HIGHLIGHT_PALETTE,
    CODE_SYNTAX_PALETTE: rules.CODE_SYNTAX_PALETTE,
    isSafeHref: rules.isSafeHref,
    matchInternalNoteHighlightColor: rules.matchInternalNoteHighlightColor,
    isAllowedInternalHighlightSpan: rules.isAllowedInternalHighlightSpan,
    isAllowedCodeSyntaxSpan: rules.isAllowedCodeSyntaxSpan,
    isSignatureElement: rules.isSignatureElement,
    isProtectedElement: rules.isProtectedElement,
    cleanPastedHtml,
    detectHiddenFormatting: detector.detectHiddenFormatting,
    cleanEditorDom,
  };

  ns.sanitizer = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
