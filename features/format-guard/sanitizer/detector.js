/**
 * Buddy for Zammad – Hidden formatting detector.
 *
 * Finds inline formatting that is invisible in Zammad's dark mode but ends up
 * in the customer's email: foreign colors, backgrounds, fonts, sizes,
 * headings and MS Office artifacts. Reports language-neutral category keys
 * ('color', 'background', 'fontFamily', 'fontSize', 'heading', 'office',
 * 'fontTag') that core/i18n.js translates.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.sanitizerParts = ns.sanitizerParts || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const rules = parts.rules || (isNode ? require('./rules.js') : null);

  const NEUTRAL_VALUES = new Set(['inherit', 'initial', 'unset']);
  const NEUTRAL_BACKGROUNDS = new Set(['none', 'transparent', 'inherit', 'initial', 'unset']);

  function cssValue(match) {
    return match ? match[1].replace(/!important/gi, '').trim() : '';
  }

  /**
   * @returns {{ issues: string[], colorSample: string | null }}
   */
  function inspectElementIssues(el, options) {
    if (options && options.isInternal === true && rules.isAllowedInternalHighlightSpan(el)) {
      return { issues: [], colorSample: null };
    }
    if (rules.isAllowedCodeSyntaxSpan(el, null)) return { issues: [], colorSample: null };

    const issues = [];
    let colorSample = null;
    const tag = el.tagName.toUpperCase();
    const style = el.getAttribute('style') || '';

    if (tag === 'FONT') {
      if (el.hasAttribute('color')) {
        colorSample = el.getAttribute('color').trim();
        issues.push('color');
      }
      if (el.hasAttribute('face')) issues.push('fontFamily');
      if (el.hasAttribute('size')) issues.push('fontSize');
      if (issues.length === 0) issues.push('fontTag');
    }
    if (tag === 'MARK' || el.hasAttribute('bgcolor')) issues.push('background');
    if (rules.HEADING_TAGS.has(tag)) issues.push('heading');

    if (style) {
      const color = cssValue(style.match(rules.STYLE_PROPS.color));
      if (color && !NEUTRAL_VALUES.has(color)) {
        colorSample = colorSample || color;
        issues.push('color');
      }
      const background = cssValue(style.match(rules.STYLE_PROPS.background));
      if (background && !NEUTRAL_BACKGROUNDS.has(background)) {
        colorSample = colorSample || background;
        issues.push('background');
      }
      if (rules.STYLE_PROPS.fontFamily.test(style)) issues.push('fontFamily');
      if (rules.STYLE_PROPS.fontSize.test(style)) issues.push('fontSize');
      if (rules.STYLE_PROPS.office.test(style)) issues.push('office');
    }

    if (/\bMso[A-Z]/i.test(el.getAttribute('class') || '')) issues.push('office');
    return { issues, colorSample };
  }

  function hasHiddenFormattingOnElement(el, options) {
    return inspectElementIssues(el, options).issues.length > 0;
  }

  /**
   * Scans a subtree (signatures and – optionally – quotes excluded).
   * @returns {{ count: number, categories: string[], colorSamples: string[] }}
   */
  function detectHiddenFormatting(rootEl, options) {
    const categories = new Set();
    const colorSamples = new Set();
    let count = 0;
    if (!rootEl) return { count: 0, categories: [], colorSamples: [] };

    function scan(node) {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType !== 1 || rules.isProtectedElement(child, options)) continue;
        const { issues, colorSample } = inspectElementIssues(child, options);
        if (issues.length > 0) {
          count++;
          for (const cat of issues) categories.add(cat);
          if (colorSample && colorSamples.size < 3) colorSamples.add(colorSample);
        }
        scan(child);
      }
    }

    scan(rootEl);
    return { count, categories: Array.from(categories), colorSamples: Array.from(colorSamples) };
  }

  const api = { inspectElementIssues, hasHiddenFormattingOnElement, detectHiddenFormatting };

  parts.detector = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
