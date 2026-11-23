/**
 * Buddy for Zammad – Format Guard rules.
 *
 * What the sanitizer keeps, drops or protects: tag allow-lists, the two color
 * palettes that are allowed on purpose (internal-note markers and code syntax
 * colors), protected elements (signatures, quotes) and URL checks.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.sanitizerParts = ns.sanitizerParts || {});
  const isNode = typeof module !== 'undefined' && module.exports;

  /** Removed together with their content. */
  const DROP_CONTENT_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'META',
    'LINK',
    'TITLE',
    'XML',
    'HEAD',
    'IFRAME',
    'OBJECT',
    'EMBED',
    'NOSCRIPT',
  ]);

  /** Semantic tags that survive; everything else is unwrapped (content kept). */
  const ALLOWED_TAGS = new Set([
    'P',
    'DIV',
    'BR',
    'HR',
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'S',
    'STRIKE',
    'DEL',
    'CODE',
    'PRE',
    'BLOCKQUOTE',
    'UL',
    'OL',
    'LI',
    'A',
    'IMG',
    'TABLE',
    'THEAD',
    'TBODY',
    'TFOOT',
    'TR',
    'TH',
    'TD',
    'COLGROUP',
    'COL',
    'SUP',
    'SUB',
  ]);

  const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

  /**
   * Highlight marker palette for internal notes. Uses plain
   * `<span style="background-color: ...;">` on purpose: Zammad's server-side
   * sanitizer (`html_sanitizer.rb`) keeps it, so colleagues without the
   * extension see the markers too.
   */
  const NOTE_HIGHLIGHT_PALETTE = Object.freeze([
    Object.freeze({ id: 'yellow', hex: '#fef08a', rgb: 'rgb(254,240,138)', i18nKey: 'hlYellow' }),
    Object.freeze({ id: 'green', hex: '#bbf7d0', rgb: 'rgb(187,247,208)', i18nKey: 'hlGreen' }),
    Object.freeze({ id: 'blue', hex: '#bae6fd', rgb: 'rgb(186,230,253)', i18nKey: 'hlBlue' }),
    Object.freeze({ id: 'red', hex: '#fecaca', rgb: 'rgb(254,202,202)', i18nKey: 'hlRed' }),
  ]);

  /** Syntax highlighting colors allowed inside `<pre>` code blocks (see editor/code-highlight.js). */
  const CODE_SYNTAX_PALETTE = Object.freeze([
    Object.freeze({ token: 'kw', hex: '#7c3aed', rgb: 'rgb(124,58,237)' }),
    Object.freeze({ token: 'str', hex: '#15803d', rgb: 'rgb(21,128,61)' }),
    Object.freeze({ token: 'key', hex: '#0369a1', rgb: 'rgb(3,105,161)' }),
    Object.freeze({ token: 'num', hex: '#b45309', rgb: 'rgb(180,83,9)' }),
    Object.freeze({ token: 'cmt', hex: '#64748b', rgb: 'rgb(100,116,139)' }),
  ]);

  const STYLE_PROPS = Object.freeze({
    color: /(?:^|;)\s*color\s*:\s*([^;]+)/i,
    background: /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i,
    fontFamily: /(?:^|;)\s*font-family\s*:\s*([^;]+)/i,
    fontSize: /(?:^|;)\s*font-size\s*:\s*([^;]+)/i,
    office: /(?:^|;)\s*mso-[a-z-]+\s*:/i,
  });

  function normalizeCssColorToken(raw) {
    return String(raw || '')
      .replace(/!important/gi, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  /**
   * Matches a style attribute that consists of exactly one declaration whose
   * property is in `props` and whose color is in `palette`.
   */
  function matchSingleColorDeclaration(styleText, props, palette) {
    if (!styleText || typeof styleText !== 'string') return null;
    const declarations = styleText
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean);
    if (declarations.length !== 1) return null;

    const colonIdx = declarations[0].indexOf(':');
    if (colonIdx === -1) return null;
    const prop = declarations[0].slice(0, colonIdx).trim().toLowerCase();
    if (!props.includes(prop)) return null;

    const value = normalizeCssColorToken(declarations[0].slice(colonIdx + 1));
    return palette.find((entry) => value === entry.hex || value === entry.rgb) || null;
  }

  function matchInternalNoteHighlightColor(styleText) {
    return matchSingleColorDeclaration(styleText, ['background-color', 'background'], NOTE_HIGHLIGHT_PALETTE);
  }

  function matchCodeSyntaxColor(styleText) {
    return matchSingleColorDeclaration(styleText, ['color'], CODE_SYNTAX_PALETTE);
  }

  /** A `<span>` whose only attribute is a single allowed style declaration. */
  function isBareStyledSpan(el) {
    if (!el || el.nodeType !== 1 || el.tagName.toUpperCase() !== 'SPAN') return false;
    const attrs = el.attributes;
    return Boolean(attrs && attrs.length === 1 && el.hasAttribute('style'));
  }

  function isAllowedInternalHighlightSpan(el) {
    return isBareStyledSpan(el) && matchInternalNoteHighlightColor(el.getAttribute('style')) !== null;
  }

  function isInsidePreBlock(el, stopAt) {
    for (
      let cur = el ? el.parentNode : null;
      cur && cur.nodeType === 1 && cur !== stopAt;
      cur = cur.parentNode
    ) {
      if (cur.tagName && cur.tagName.toUpperCase() === 'PRE') return true;
    }
    return false;
  }

  function isAllowedCodeSyntaxSpan(el, stopAt) {
    return (
      isBareStyledSpan(el) &&
      isInsidePreBlock(el, stopAt) &&
      matchCodeSyntaxColor(el.getAttribute('style')) !== null
    );
  }

  /** Zammad's signature block in its different historical markups. */
  function isSignatureElement(el) {
    if (!el || el.nodeType !== 1) return false;
    return (
      el.hasAttribute('data-signature') ||
      el.hasAttribute('data-signature-id') ||
      el.hasAttribute('data-signature-placeholder') ||
      el.classList.contains('js-signatureMarker')
    );
  }

  /** Signatures are never touched; quoted replies only if `preserveBlockquotes` is on. */
  function isProtectedElement(el, options) {
    if (!el || el.nodeType !== 1) return false;
    if (isSignatureElement(el)) return true;
    const preserveQuotes = !options || options.preserveBlockquotes !== false;
    return preserveQuotes && el.tagName === 'BLOCKQUOTE';
  }

  function isSafeHref(href) {
    const trimmed = String(href || '').trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true;
    return /^(https?:|mailto:|tel:)/i.test(trimmed);
  }

  function isSafeImgSrc(src) {
    return /^(https?:|data:image\/|blob:|cid:|\/)/i.test(String(src || '').trim());
  }

  const api = {
    DROP_CONTENT_TAGS,
    ALLOWED_TAGS,
    HEADING_TAGS,
    NOTE_HIGHLIGHT_PALETTE,
    CODE_SYNTAX_PALETTE,
    STYLE_PROPS,
    matchInternalNoteHighlightColor,
    matchCodeSyntaxColor,
    isAllowedInternalHighlightSpan,
    isAllowedCodeSyntaxSpan,
    isSignatureElement,
    isProtectedElement,
    isSafeHref,
    isSafeImgSrc,
  };

  parts.rules = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
