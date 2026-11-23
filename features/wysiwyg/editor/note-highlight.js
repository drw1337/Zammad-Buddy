/**
 * Buddy for Zammad – Highlight markers for internal notes.
 *
 * Markers are plain `<span style="background-color: #…;">` with one of four
 * palette colors. The Format Guard tolerates exactly these spans in internal
 * notes and flags them as soon as a draft is switched to a public reply.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const sanitizer = ns.sanitizer || (isNode ? require('../../format-guard/sanitizer.js') : null);
  const dom = editor.dom || (isNode ? require('./dom.js') : null);

  /** Fallback if the sanitizer is not loaded; the sanitizer's palette is authoritative. */
  const DEFAULT_PALETTE = Object.freeze([
    Object.freeze({ id: 'yellow', hex: '#fef08a', rgb: 'rgb(254,240,138)', i18nKey: 'hlYellow' }),
    Object.freeze({ id: 'green', hex: '#bbf7d0', rgb: 'rgb(187,247,208)', i18nKey: 'hlGreen' }),
    Object.freeze({ id: 'blue', hex: '#bae6fd', rgb: 'rgb(186,230,253)', i18nKey: 'hlBlue' }),
    Object.freeze({ id: 'red', hex: '#fecaca', rgb: 'rgb(254,202,202)', i18nKey: 'hlRed' }),
  ]);

  const HIGHLIGHT_PALETTE = (sanitizer && sanitizer.NOTE_HIGHLIGHT_PALETTE) || DEFAULT_PALETTE;

  function matchHighlightEntry(styleText) {
    if (sanitizer && typeof sanitizer.matchInternalNoteHighlightColor === 'function') {
      return sanitizer.matchInternalNoteHighlightColor(styleText);
    }
    return null;
  }

  function isHighlightSpan(el) {
    return Boolean(
      el &&
      el.nodeType === 1 &&
      el.tagName.toUpperCase() === 'SPAN' &&
      matchHighlightEntry(el.getAttribute('style') || '')
    );
  }

  /** @returns {{ el: HTMLElement, entry: object } | null} */
  function findClosestNoteHighlight(node, editorEl) {
    let cur = node && node.nodeType === 3 ? node.parentNode : node;
    while (cur && cur !== editorEl && cur.nodeType === 1) {
      if (cur.tagName.toUpperCase() === 'SPAN') {
        const entry = matchHighlightEntry(cur.getAttribute('style') || '');
        if (entry) return { el: cur, entry };
      }
      cur = cur.parentNode;
    }
    return null;
  }

  function unwrapNestedHighlights(frag) {
    if (typeof frag.querySelectorAll !== 'function') return;
    for (const span of Array.from(frag.querySelectorAll('span'))) {
      if (isHighlightSpan(span)) dom.unwrapNodePreservingChildren(span);
    }
  }

  function unwrapAndReselect(editorEl, el) {
    const res = dom.unwrapNodePreservingChildren(el);
    if (res && res.first && res.last) dom.selectNodeSpan(editorEl, res.first, res.last);
  }

  /**
   * Applies a marker color. Clicking the active color again removes it,
   * another color recolors the existing marker.
   * @param {string} colorHexOrId palette hex value or id
   */
  function applyNoteHighlight(editorEl, savedRange, colorHexOrId) {
    const wanted = String(colorHexOrId || '').toLowerCase();
    const paletteEntry = HIGHLIGHT_PALETTE.find(
      (p) => p.hex.toLowerCase() === wanted || p.id === colorHexOrId
    );
    if (!paletteEntry) return false;

    const range = dom.acquireEditableRange(editorEl, savedRange);
    if (!range) return false;

    const existing = findClosestNoteHighlight(range.commonAncestorContainer, editorEl);
    if (existing) {
      if (existing.entry.hex === paletteEntry.hex) {
        unwrapAndReselect(editorEl, existing.el);
      } else {
        existing.el.setAttribute('style', `background-color: ${paletteEntry.hex};`);
      }
      dom.notifyEditorChanged(editorEl);
      return true;
    }

    if (range.collapsed) return false;

    const { doc } = dom.getDocAndSelection(editorEl);
    const span = doc.createElement('span');
    span.setAttribute('style', `background-color: ${paletteEntry.hex};`);
    const frag = range.extractContents();
    unwrapNestedHighlights(frag);
    span.appendChild(frag);
    range.insertNode(span);

    const next = doc.createRange();
    next.selectNodeContents(span);
    dom.applyRange(editorEl, next);
    dom.notifyEditorChanged(editorEl);
    return true;
  }

  /** Removes the marker under the caret, or all markers inside the selection. */
  function removeNoteHighlight(editorEl, savedRange) {
    const range = dom.acquireEditableRange(editorEl, savedRange);
    if (!range) return false;

    const existing = findClosestNoteHighlight(range.commonAncestorContainer, editorEl);
    if (existing) {
      unwrapAndReselect(editorEl, existing.el);
      dom.notifyEditorChanged(editorEl);
      return true;
    }

    if (range.collapsed) return false;
    dom.transformRangeContents(editorEl, range, unwrapNestedHighlights);
    dom.notifyEditorChanged(editorEl);
    return true;
  }

  const api = {
    HIGHLIGHT_PALETTE,
    findClosestNoteHighlight,
    applyNoteHighlight,
    removeNoteHighlight,
  };

  editor.noteHighlight = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
