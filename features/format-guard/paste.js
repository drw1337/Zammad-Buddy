/**
 * Buddy for Zammad – Paste helpers of the Format Guard.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.formatGuardParts = ns.formatGuardParts || {});

  /**
   * True if the clipboard only carries images / files (screenshots, attachments).
   * Those pastes go straight to Zammad, which handles uploads itself.
   * @param {DataTransfer} clipboardData
   */
  function hasOnlyImageOrFilePayload(clipboardData) {
    if (!clipboardData || !clipboardData.files || clipboardData.files.length === 0) return false;
    const html = (clipboardData.getData('text/html') || '').trim();
    const plain = (clipboardData.getData('text/plain') || '').trim();
    if (!html && !plain) return true;
    return !plain && /<img\b/i.test(html) && !html.replace(/<[^>]+>/g, '').trim();
  }

  /**
   * Inserts already cleaned HTML at the caret. `insertHTML` keeps the browser's
   * undo history; the Range API is the fallback.
   */
  function insertHtmlAtSelection(editorEl, cleanHtml) {
    const doc = editorEl.ownerDocument || root.document;
    editorEl.focus();

    if (typeof doc.execCommand === 'function') {
      try {
        if (doc.execCommand('insertHTML', false, cleanHtml)) return;
      } catch (_) {
        // Fall back to the Range API below.
      }
    }

    const win = doc.defaultView || root;
    const sel = win.getSelection ? win.getSelection() : null;
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (!range || !editorEl.contains(range.commonAncestorContainer)) {
      editorEl.appendChild(ns.safeHtml.parseFragment(doc, cleanHtml));
      return;
    }

    range.deleteContents();
    const frag = ns.safeHtml.parseFragment(doc, cleanHtml);
    const lastNode = frag.lastChild;
    range.insertNode(frag);
    if (lastNode) {
      const after = doc.createRange();
      after.setStartAfter(lastNode);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    }
  }

  /** Fires `input` + `change` so Zammad saves the draft. */
  function notifyEditorChanged(editorEl) {
    editorEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    editorEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  }

  parts.paste = { hasOnlyImageOrFilePayload, insertHtmlAtSelection, notifyEditorChanged };
})(typeof globalThis !== 'undefined' ? globalThis : window);
