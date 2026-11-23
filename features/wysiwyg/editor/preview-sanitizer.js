/**
 * Buddy for Zammad – HTML scrubber for the in-place email preview.
 *
 * The preview mirrors the editor's HTML into a sibling element. Inline styles
 * are kept on purpose (the preview exists to show the real outgoing colors),
 * but anything executable or page-altering is removed first.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;

  const DANGEROUS_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'IFRAME',
    'FRAME',
    'FRAMESET',
    'OBJECT',
    'EMBED',
    'APPLET',
    'META',
    'LINK',
    'BASE',
    'FORM',
    'TEMPLATE',
  ]);

  const URL_ATTRIBUTES = new Set([
    'href',
    'src',
    'xlink:href',
    'action',
    'formaction',
    'srcset',
    'background',
  ]);
  const SCRIPT_URL = /^\s*(javascript|vbscript):/i;
  const DATA_URL = /^\s*data:/i;
  const DATA_IMAGE_URL = /^\s*data:image\/(png|gif|jpe?g|webp);/i;

  function isUnsafeUrl(attrName, value) {
    if (SCRIPT_URL.test(value)) return true;
    // Inline images pasted into Zammad are data URLs; other data URLs are not needed.
    if (DATA_URL.test(value)) return !(attrName === 'src' && DATA_IMAGE_URL.test(value));
    return false;
  }

  function scrubAttributes(el) {
    for (const attrName of Array.from(el.attributes || []).map((a) => a.name)) {
      const lower = attrName.toLowerCase();
      if (lower.startsWith('on') || lower === 'data-zb-ui' || lower === 'srcdoc') {
        el.removeAttribute(attrName);
      } else if (URL_ATTRIBUTES.has(lower) && isUnsafeUrl(lower, el.getAttribute(attrName) || '')) {
        el.removeAttribute(attrName);
      }
    }
  }

  function scrub(node) {
    let ch = node.firstChild;
    while (ch) {
      const next = ch.nextSibling;
      if (ch.nodeType === 1) {
        if (DANGEROUS_TAGS.has(ch.tagName.toUpperCase())) {
          node.removeChild(ch);
        } else {
          scrubAttributes(ch);
          scrub(ch);
        }
      } else if (ch.nodeType === 8) {
        node.removeChild(ch);
      }
      ch = next;
    }
  }

  /**
   * @param {string} rawHtml editor HTML
   * @param {typeof DOMParser} [ParserCtor] injectable for Node tests
   * @returns {string} scrubbed HTML
   */
  function sanitizePreviewHtml(rawHtml, ParserCtor) {
    if (!rawHtml || !String(rawHtml).trim()) return '';
    const Ctor = ParserCtor || root.DOMParser;
    if (!Ctor) return '';
    const doc = new Ctor().parseFromString(String(rawHtml), 'text/html');
    scrub(doc.body);
    return doc.body.innerHTML;
  }

  const api = { sanitizePreviewHtml };

  editor.previewSanitizer = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
