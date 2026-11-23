/**
 * Buddy for Zammad – Clear formatting and toolbar state detection.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const dom = editor.dom || (isNode ? require('./dom.js') : null);
  const noteHighlight = editor.noteHighlight || (isNode ? require('./note-highlight.js') : null);

  /** Inline wrappers removed by "Clear formatting". */
  const INLINE_FORMAT_TAGS = new Set([
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'S',
    'STRIKE',
    'DEL',
    'CODE',
    'SPAN',
    'FONT',
    'MARK',
    'SUP',
    'SUB',
  ]);

  /** Unwraps inline formatting and drops `style` attributes (images keep theirs). */
  function stripInlineFormatsInFragment(frag) {
    function walk(node) {
      let ch = node.firstChild;
      while (ch) {
        const next = ch.nextSibling;
        if (ch.nodeType === 1 && !dom.isSignatureNode(ch)) {
          walk(ch);
          const tag = ch.tagName.toUpperCase();
          if (INLINE_FORMAT_TAGS.has(tag)) {
            dom.unwrapNodePreservingChildren(ch);
          } else if (ch.hasAttribute && ch.hasAttribute('style') && tag !== 'IMG') {
            ch.removeAttribute('style');
          }
        }
        ch = next;
      }
    }
    walk(frag);
  }

  /** Collapsed caret: removes the inline code or marker around it. */
  function clearAtCaret(editorEl, range) {
    const anchor = range.commonAncestorContainer;
    if (dom.isInsideSignature(anchor, editorEl)) return false;

    const inlineCode = dom.findClosestTag(anchor, editorEl, 'CODE');
    const target =
      inlineCode && !dom.findClosestTag(inlineCode, editorEl, 'PRE')
        ? inlineCode
        : (noteHighlight.findClosestNoteHighlight(anchor, editorEl) || {}).el;
    if (!target) return false;

    dom.unwrapNodePreservingChildren(target);
    dom.notifyEditorChanged(editorEl);
    return true;
  }

  /**
   * Removes all inline formatting from the selection. A selection reaching into
   * the signature is cut off right before it.
   */
  function clearSelectionFormatting(editorEl) {
    if (!editorEl) return false;
    const range = dom.restoreSelectionRange(editorEl, null);
    if (!range) return false;
    if (range.collapsed) return clearAtCaret(editorEl, range);

    const sigEl = dom.findSignatureElement(editorEl);
    if (sigEl && range.intersectsNode && range.intersectsNode(sigEl)) {
      if (dom.isInsideSignature(range.startContainer, editorEl)) return false;
      range.setEndBefore(sigEl);
      if (range.collapsed) return false;
    }

    const { doc, sel } = dom.getDocAndSelection(editorEl);
    dom.runNativeCommand(doc, 'removeFormat');

    // `removeFormat` misses spans, code and classes; finish the job by hand.
    const active = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (active && !active.collapsed && editorEl.contains(active.commonAncestorContainer)) {
      if (sigEl && active.intersectsNode && active.intersectsNode(sigEl)) active.setEndBefore(sigEl);
      if (!active.collapsed) dom.transformRangeContents(editorEl, active, stripInlineFormatsInFragment);
    }

    dom.notifyEditorChanged(editorEl);
    return true;
  }

  function safeQueryState(doc, cmd) {
    if (!doc || typeof doc.queryCommandState !== 'function') return false;
    try {
      return Boolean(doc.queryCommandState(cmd));
    } catch (_) {
      return false;
    }
  }

  const EMPTY_STATE = Object.freeze({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    ol: false,
    quote: false,
    code: false,
    codeBlock: false,
    link: false,
    highlightColor: null,
    inSignature: false,
  });

  /**
   * Reports which toolbar buttons should appear active for the current selection.
   * @returns {typeof EMPTY_STATE}
   */
  function queryToolbarState(editorEl) {
    if (!editorEl) return Object.assign({}, EMPTY_STATE);
    const { doc, sel } = dom.getDocAndSelection(editorEl);
    if (!sel || sel.rangeCount === 0) return Object.assign({}, EMPTY_STATE);

    const range = sel.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) return Object.assign({}, EMPTY_STATE);

    const anchor = range.commonAncestorContainer;
    if (dom.isInsideSignature(anchor, editorEl)) {
      return Object.assign({}, EMPTY_STATE, { inSignature: true });
    }

    const closest = (tags) => Boolean(dom.findClosestTag(anchor, editorEl, tags));
    const codeBlockEl = dom.findClosestTag(anchor, editorEl, 'PRE');
    const hl = noteHighlight.findClosestNoteHighlight(anchor, editorEl);
    const closestList = dom.findClosestTag(anchor, editorEl, ['UL', 'OL']);
    const listTag = closestList ? closestList.tagName.toUpperCase() : '';

    return {
      bold: safeQueryState(doc, 'bold') || closest(['B', 'STRONG']),
      italic: safeQueryState(doc, 'italic') || closest(['I', 'EM']),
      underline: safeQueryState(doc, 'underline') || closest('U'),
      strike: safeQueryState(doc, 'strikeThrough') || closest(['S', 'STRIKE', 'DEL']),
      ul: listTag === 'UL',
      ol: listTag === 'OL',
      quote: closest('BLOCKQUOTE'),
      code: !codeBlockEl && closest('CODE'),
      codeBlock: Boolean(codeBlockEl),
      link: closest('A'),
      highlightColor: hl ? hl.entry.hex : null,
      inSignature: false,
    };
  }

  const api = { clearSelectionFormatting, queryToolbarState };

  editor.formatting = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
