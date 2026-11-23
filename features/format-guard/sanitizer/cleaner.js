/**
 * Buddy for Zammad – Subtree cleaner.
 *
 * Walks a DOM subtree and removes hidden formatting while keeping meaning:
 * bold / italic / underline / strike expressed via inline styles become real
 * `<strong>` / `<em>` / `<u>` / `<s>`, headings become bold lines, unknown
 * wrappers are unwrapped, and only safe attributes remain. Protected elements
 * (signatures, optionally quotes) and the allowed color palettes are kept.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.sanitizerParts = ns.sanitizerParts || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const rules = parts.rules || (isNode ? require('./rules.js') : null);
  const detector = parts.detector || (isNode ? require('./detector.js') : null);

  /** Attributes kept per tag (everything else is removed). */
  const KEPT_ATTRIBUTES = Object.freeze({
    A: new Set(['data-target-id', 'data-target-type', 'data-mention-user-id']), // Zammad @mentions
    IMG: new Set(['alt', 'width', 'height']),
    TD: new Set(['colspan', 'rowspan']),
    TH: new Set(['colspan', 'rowspan']),
    BLOCKQUOTE: new Set(['type', 'cite']),
  });

  const IMG_SIZE_PROPS = new Set(['width', 'height', 'max-width', 'max-height']);

  function extractSemanticFormatsFromStyle(styleText) {
    const formats = { bold: false, italic: false, underline: false, strike: false };
    if (!styleText) return formats;

    const weight = styleText.match(/(?:^|;)\s*font-weight\s*:\s*([^;]+)/i);
    if (weight) {
      const w = weight[1].trim().toLowerCase();
      const num = parseInt(w, 10);
      formats.bold = w === 'bold' || w === 'bolder' || (!Number.isNaN(num) && num >= 600);
    }

    const fontStyle = styleText.match(/(?:^|;)\s*font-style\s*:\s*([^;]+)/i);
    formats.italic = Boolean(fontStyle && /italic|oblique/i.test(fontStyle[1]));

    const deco = styleText.match(/(?:^|;)\s*text-decoration(?:-line)?\s*:\s*([^;]+)/i);
    if (deco) {
      formats.underline = /underline/i.test(deco[1]);
      formats.strike = /line-through/i.test(deco[1]);
    }
    return formats;
  }

  const hasAnyFormat = (f) => f.bold || f.italic || f.underline || f.strike;

  /** Moves all children of `parentEl` into nested `<strong><em>…` wrappers. */
  function wrapChildrenWithSemanticTags(doc, parentEl, formats) {
    const tags = [];
    if (formats.bold) tags.push('STRONG');
    if (formats.italic) tags.push('EM');
    if (formats.underline) tags.push('U');
    if (formats.strike) tags.push('S');
    if (tags.length === 0) return;

    let outer = null;
    let inner = null;
    for (const tag of tags) {
      const w = doc.createElement(tag);
      if (inner) inner.appendChild(w);
      else outer = w;
      inner = w;
    }
    while (parentEl.firstChild) inner.appendChild(parentEl.firstChild);
    parentEl.appendChild(outer);
  }

  function unwrapElement(el) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }

  /** Images may keep numeric size declarations only. */
  function sanitizeImgStyle(styleText) {
    const allowed = [];
    for (const part of String(styleText || '').split(';')) {
      const idx = part.indexOf(':');
      if (idx === -1) continue;
      const prop = part.slice(0, idx).trim().toLowerCase();
      const val = part.slice(idx + 1).trim();
      if (IMG_SIZE_PROPS.has(prop) && /^[0-9.%px\s]+$/i.test(val)) allowed.push(`${prop}: ${val}`);
    }
    return allowed.join('; ');
  }

  function cleanElementAttributes(el) {
    const tag = el.tagName;
    const kept = KEPT_ATTRIBUTES[tag];

    for (const name of Array.from(el.attributes).map((a) => a.name)) {
      const lower = name.toLowerCase();

      if (tag === 'A' && lower === 'href') {
        if (!rules.isSafeHref(el.getAttribute(name))) el.removeAttribute(name);
        continue;
      }
      if (tag === 'IMG' && lower === 'src') {
        if (!rules.isSafeImgSrc(el.getAttribute(name))) el.removeAttribute(name);
        continue;
      }
      if (tag === 'IMG' && lower === 'style') {
        const cleanStyle = sanitizeImgStyle(el.getAttribute(name));
        if (cleanStyle) el.setAttribute('style', cleanStyle);
        else el.removeAttribute('style');
        continue;
      }
      if (kept && kept.has(lower)) continue;
      el.removeAttribute(name);
    }
  }

  /** Normalizes an allowed palette span to its canonical declaration. */
  function keepPaletteSpan(child, options, container) {
    if (options && options.isInternal === true && rules.isAllowedInternalHighlightSpan(child)) {
      const entry = rules.matchInternalNoteHighlightColor(child.getAttribute('style'));
      child.setAttribute('style', `background-color: ${entry.hex};`);
      return true;
    }
    if (rules.isAllowedCodeSyntaxSpan(child, container)) {
      const entry = rules.matchCodeSyntaxColor(child.getAttribute('style'));
      child.setAttribute('style', `color: ${entry.hex};`);
      return true;
    }
    return false;
  }

  /**
   * Cleans `container` in place.
   * @returns {number} number of elements that were changed
   */
  function sanitizeSubtree(doc, container, options) {
    let cleanedCount = 0;

    function cleanElement(node, child) {
      const tag = child.tagName.toUpperCase();

      if (rules.isProtectedElement(child, options)) return;

      // Namespaced Office tags (<o:p>, <w:sdt>) carry no meaning.
      if (tag.includes(':')) {
        cleanedCount++;
        unwrapElement(child);
        return;
      }
      if (rules.DROP_CONTENT_TAGS.has(tag)) {
        cleanedCount++;
        node.removeChild(child);
        return;
      }

      walk(child);
      if (keepPaletteSpan(child, options, container)) return;

      const hadDirtyAttrs = detector.hasHiddenFormattingOnElement(child, options);
      const formats = extractSemanticFormatsFromStyle(child.getAttribute('style') || '');

      if (rules.HEADING_TAGS.has(tag)) {
        cleanedCount++;
        const replacement = doc.createElement('DIV');
        const strong = doc.createElement('STRONG');
        while (child.firstChild) strong.appendChild(child.firstChild);
        replacement.appendChild(strong);
        node.replaceChild(replacement, child);
        return;
      }

      if (!rules.ALLOWED_TAGS.has(tag)) {
        if (hadDirtyAttrs || tag === 'FONT' || tag === 'MARK') cleanedCount++;
        if (hasAnyFormat(formats)) wrapChildrenWithSemanticTags(doc, child, formats);
        unwrapElement(child);
        return;
      }

      if (hadDirtyAttrs) cleanedCount++;

      // Only add what the tag does not already express.
      const needed = {
        bold: formats.bold && !['B', 'STRONG', 'TH'].includes(tag),
        italic: formats.italic && !['I', 'EM'].includes(tag),
        underline: formats.underline && tag !== 'U',
        strike: formats.strike && !['S', 'STRIKE', 'DEL'].includes(tag),
      };

      cleanElementAttributes(child);

      if (tag === 'IMG' && !child.getAttribute('src')) {
        node.removeChild(child);
        return;
      }
      if (hasAnyFormat(needed)) wrapChildrenWithSemanticTags(doc, child, needed);
    }

    function walk(node) {
      let child = node.firstChild;
      while (child) {
        const next = child.nextSibling;
        if (child.nodeType === 8)
          node.removeChild(child); // comments (incl. Office conditionals)
        else if (child.nodeType === 1) cleanElement(node, child);
        child = next;
      }
    }

    walk(container);
    return cleanedCount;
  }

  const api = { sanitizeSubtree, unwrapElement };

  parts.cleaner = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
