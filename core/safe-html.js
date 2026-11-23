/**
 * Buddy for Zammad – Inert HTML parsing for all in-page and popup UI.
 *
 * Markup is never assigned via `innerHTML`, `insertAdjacentHTML` or
 * `createContextualFragment` on the live page. It is parsed with `DOMParser`
 * into a separate, inert document (no scripts run, nothing loads) and the
 * resulting nodes are imported. Callers still pass only trusted markup: static
 * icons, internally generated HTML, or output of the Format Guard / preview
 * sanitizers.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const isNode = typeof module !== 'undefined' && module.exports;

  /**
   * Parses `html` and returns its top-level nodes, owned by `doc`.
   * @param {Document} doc target document
   * @param {string} html trusted or sanitized markup
   * @param {typeof DOMParser} [ParserCtor] injectable for Node tests
   * @returns {Node[]}
   */
  function parseNodes(doc, html, ParserCtor) {
    const Ctor = ParserCtor || (doc.defaultView && doc.defaultView.DOMParser) || root.DOMParser;
    const parsed = new Ctor().parseFromString(String(html || ''), 'text/html');
    return Array.from(parsed.body.childNodes, (node) =>
      typeof doc.importNode === 'function' ? doc.importNode(node, true) : node
    );
  }

  /**
   * Parses `html` into a DocumentFragment of `doc` (for Range insertion).
   * @param {Document} doc
   * @param {string} html
   * @returns {DocumentFragment}
   */
  function parseFragment(doc, html) {
    const frag = doc.createDocumentFragment();
    for (const node of parseNodes(doc, html)) frag.appendChild(node);
    return frag;
  }

  /**
   * Replaces the children of `el` with the parsed `html` (e.g. an SVG icon).
   * @param {Element} el
   * @param {string} html
   * @param {typeof DOMParser} [ParserCtor]
   * @returns {Node[]} the inserted nodes
   */
  function setHtml(el, html, ParserCtor) {
    while (el.firstChild) el.removeChild(el.firstChild);
    const nodes = parseNodes(el.ownerDocument, html, ParserCtor);
    for (const node of nodes) el.appendChild(node);
    return nodes;
  }

  const api = { parseNodes, parseFragment, setHtml };

  ns.safeHtml = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
