/**
 * Buddy for Zammad – Editor DOM & selection primitives.
 *
 * Low-level helpers shared by every editor command. They operate directly on
 * Zammad's `[data-name="body"][contenteditable="true"]` and never touch the
 * signature block (`div[data-signature="true"]` and friends).
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const sanitizer = ns.sanitizer || (isNode ? require('../../format-guard/sanitizer.js') : null);

  const SIGNATURE_SELECTOR =
    '[data-signature], [data-signature-id], [data-signature-placeholder], .js-signatureMarker';

  /**
   * Escapes text for safe use inside HTML markup and attribute values.
   * @param {unknown} str
   * @returns {string}
   */
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Fires `input` + `change` so Zammad's draft autosave and dirty tracking
   * notice programmatic DOM changes.
   * @param {HTMLElement} editorEl
   */
  function notifyEditorChanged(editorEl) {
    if (!editorEl || typeof editorEl.dispatchEvent !== 'function') return;
    if (typeof Event === 'function') {
      editorEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      editorEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    }
  }

  /**
   * @param {HTMLElement} editorEl
   * @returns {{ doc: Document, win: Window, sel: Selection | null }}
   */
  function getDocAndSelection(editorEl) {
    const doc = (editorEl && editorEl.ownerDocument) || root.document;
    const win = (doc && doc.defaultView) || root;
    const sel = win && typeof win.getSelection === 'function' ? win.getSelection() : null;
    return { doc, win, sel };
  }

  /**
   * Runs a legacy `document.execCommand` safely.
   * @returns {boolean} whether the browser reported success
   */
  function runNativeCommand(doc, command, value) {
    if (!doc || typeof doc.execCommand !== 'function') return false;
    try {
      return Boolean(doc.execCommand(command, false, value === undefined ? null : value));
    } catch (_) {
      return false;
    }
  }

  function isSignatureNode(node) {
    if (!node || node.nodeType !== 1) return false;
    if (sanitizer && typeof sanitizer.isSignatureElement === 'function') {
      return sanitizer.isSignatureElement(node);
    }
    return (
      (node.hasAttribute &&
        (node.hasAttribute('data-signature') ||
          node.hasAttribute('data-signature-id') ||
          node.hasAttribute('data-signature-placeholder'))) ||
      (node.classList && node.classList.contains('js-signatureMarker'))
    );
  }

  function isInsideSignature(node, editorEl) {
    let cur = node && node.nodeType === 3 ? node.parentNode : node;
    while (cur && cur !== editorEl) {
      if (isSignatureNode(cur)) return true;
      cur = cur.parentNode;
    }
    return false;
  }

  function findSignatureElement(editorEl) {
    if (!editorEl) return null;
    for (const child of editorEl.children || []) {
      if (isSignatureNode(child)) return child;
    }
    if (typeof editorEl.querySelector === 'function') {
      try {
        return editorEl.querySelector(SIGNATURE_SELECTOR);
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  /**
   * Walks up from `node` (inclusive) to the editor root and returns the first
   * element whose tag name is in `tagNames`.
   * @param {Node} node
   * @param {HTMLElement} editorEl
   * @param {string | string[]} tagNames
   * @returns {HTMLElement | null}
   */
  function findClosestTag(node, editorEl, tagNames) {
    const allowed = new Set(
      (Array.isArray(tagNames) ? tagNames : [tagNames]).map((t) => String(t).toUpperCase())
    );
    let cur = node && node.nodeType === 3 ? node.parentNode : node;
    while (cur && cur !== editorEl && cur.nodeType === 1) {
      if (allowed.has(cur.tagName.toUpperCase())) return cur;
      cur = cur.parentNode;
    }
    return null;
  }

  /**
   * Clones the current selection if it lies inside the editor. Popovers call this
   * before stealing focus so the caret can be restored afterwards.
   */
  function saveSelectionRange(editorEl) {
    const { sel } = getDocAndSelection(editorEl);
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!editorEl || !editorEl.contains(range.commonAncestorContainer)) return null;
    return range.cloneRange();
  }

  /**
   * Focuses the editor and restores `savedRange`. Falls back to the current
   * in-editor selection, or to a caret right above the signature.
   * @returns {Range | null}
   */
  function restoreSelectionRange(editorEl, savedRange) {
    if (!editorEl) return null;
    if (typeof editorEl.focus === 'function') editorEl.focus();
    const { doc, sel } = getDocAndSelection(editorEl);
    if (!sel) return null;

    if (savedRange && editorEl.contains(savedRange.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
      return savedRange;
    }

    if (sel.rangeCount > 0) {
      const current = sel.getRangeAt(0);
      if (editorEl.contains(current.commonAncestorContainer)) return current;
    }

    const fallback = doc.createRange();
    const sigEl = findSignatureElement(editorEl);
    if (sigEl && sigEl.parentNode === editorEl) {
      fallback.setStartBefore(sigEl);
      fallback.collapse(true);
    } else {
      fallback.selectNodeContents(editorEl);
      fallback.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(fallback);
    return fallback;
  }

  /**
   * Restores the selection and rejects it when it sits inside the signature.
   * This is the standard entry point for every mutating command.
   * @returns {Range | null}
   */
  function acquireEditableRange(editorEl, savedRange) {
    if (!editorEl) return null;
    const range = restoreSelectionRange(editorEl, savedRange || null);
    if (!range || isInsideSignature(range.commonAncestorContainer, editorEl)) return null;
    return range;
  }

  function applyRange(editorEl, range) {
    const { sel } = getDocAndSelection(editorEl);
    if (!sel || !range) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function selectNodeContentsAndCollapse(editorEl, targetNode, toStart) {
    const { doc } = getDocAndSelection(editorEl);
    if (!doc || !targetNode) return;
    const r = doc.createRange();
    r.selectNodeContents(targetNode);
    r.collapse(Boolean(toStart));
    applyRange(editorEl, r);
  }

  function placeCaretAfter(editorEl, refNode) {
    const { doc } = getDocAndSelection(editorEl);
    if (!doc || !refNode || !refNode.parentNode) return;
    const r = doc.createRange();
    r.setStartAfter(refNode);
    r.collapse(true);
    applyRange(editorEl, r);
  }

  /** Selects everything from `first` to `last` (inclusive). */
  function selectNodeSpan(editorEl, first, last) {
    const { doc } = getDocAndSelection(editorEl);
    if (!doc || !first) return;
    const r = doc.createRange();
    r.setStartBefore(first);
    r.setEndAfter(last || first);
    applyRange(editorEl, r);
  }

  /**
   * Replaces an element with its children.
   * @returns {{ first: Node | null, last: Node | null, parent: Node } | null}
   */
  function unwrapNodePreservingChildren(el) {
    if (!el || !el.parentNode) return null;
    const parent = el.parentNode;
    const first = el.firstChild;
    const last = el.lastChild;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
    return { first, last, parent };
  }

  /**
   * Inserts trusted, internally generated HTML at `range` and returns the
   * inserted top-level nodes.
   */
  function insertHtmlAtRange(doc, range, html) {
    range.deleteContents();
    const nodes = ns.safeHtml.parseNodes(doc, html);
    const frag = doc.createDocumentFragment();
    for (const node of nodes) frag.appendChild(node);
    range.insertNode(frag);
    return nodes;
  }

  /**
   * Extracts the range into a temporary wrapper, lets `transform` mutate the
   * fragment, puts it back and re-selects the result.
   */
  function transformRangeContents(editorEl, range, transform) {
    const { doc } = getDocAndSelection(editorEl);
    const frag = range.extractContents();
    transform(frag);
    const marker = doc.createElement('span');
    marker.appendChild(frag);
    range.insertNode(marker);
    const res = unwrapNodePreservingChildren(marker);
    if (res && res.first && res.last) selectNodeSpan(editorEl, res.first, res.last);
  }

  const api = {
    SIGNATURE_SELECTOR,
    escapeHtml,
    notifyEditorChanged,
    getDocAndSelection,
    runNativeCommand,
    isSignatureNode,
    isInsideSignature,
    findSignatureElement,
    findClosestTag,
    saveSelectionRange,
    restoreSelectionRange,
    acquireEditableRange,
    applyRange,
    selectNodeContentsAndCollapse,
    placeCaretAfter,
    selectNodeSpan,
    unwrapNodePreservingChildren,
    insertHtmlAtRange,
    transformRangeContents,
  };

  editor.dom = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
