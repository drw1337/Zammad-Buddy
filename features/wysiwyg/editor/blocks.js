/**
 * Buddy for Zammad – Inline and block commands.
 *
 * Bold/italic/… via the browser's native commands (keeps Zammad's undo stack),
 * plus blockquotes, inline code, horizontal rules, code blocks and emojis.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const dom = editor.dom || (isNode ? require('./dom.js') : null);
  const codeHighlight = editor.codeHighlight || (isNode ? require('./code-highlight.js') : null);

  const BLOCK_TAGS = new Set([
    'DIV',
    'P',
    'LI',
    'TR',
    'PRE',
    'BLOCKQUOTE',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
  ]);

  /**
   * Runs a native inline command (`bold`, `italic`, `insertUnorderedList`, …).
   * Refused inside the signature.
   */
  function execInlineCommand(editorEl, command) {
    if (!editorEl) return false;
    const range = dom.restoreSelectionRange(editorEl, null);
    if (range && dom.isInsideSignature(range.commonAncestorContainer, editorEl)) return false;

    const { doc } = dom.getDocAndSelection(editorEl);
    const ok = dom.runNativeCommand(doc, command);
    dom.notifyEditorChanged(editorEl);
    return ok;
  }

  /** Wraps the current block in `<blockquote>` or removes the surrounding one. */
  function toggleBlockquote(editorEl) {
    const range = dom.acquireEditableRange(editorEl, null);
    if (!range) return false;

    const { doc } = dom.getDocAndSelection(editorEl);
    const existingQuote = dom.findClosestTag(range.commonAncestorContainer, editorEl, 'BLOCKQUOTE');

    if (existingQuote) {
      const handled = dom.runNativeCommand(doc, 'outdent');
      if (!handled || editorEl.contains(existingQuote)) {
        const res = dom.unwrapNodePreservingChildren(existingQuote);
        if (res && res.first) dom.selectNodeSpan(editorEl, res.first, res.last);
      }
      dom.notifyEditorChanged(editorEl);
      return true;
    }

    if (!dom.runNativeCommand(doc, 'formatBlock', 'blockquote')) {
      const bq = doc.createElement('blockquote');
      if (range.collapsed) {
        bq.innerHTML = '<br>';
        range.insertNode(bq);
        dom.selectNodeContentsAndCollapse(editorEl, bq, true);
      } else {
        bq.appendChild(range.extractContents());
        range.insertNode(bq);
        dom.selectNodeContentsAndCollapse(editorEl, bq, false);
      }
    }

    dom.notifyEditorChanged(editorEl);
    return true;
  }

  /** Toggles `<code>` around the selection. Code inside `<pre>` blocks is left alone. */
  function toggleInlineCode(editorEl) {
    const range = dom.acquireEditableRange(editorEl, null);
    if (!range) return false;

    const { doc } = dom.getDocAndSelection(editorEl);
    const existingCode = dom.findClosestTag(range.commonAncestorContainer, editorEl, 'CODE');

    if (existingCode && !dom.findClosestTag(existingCode, editorEl, 'PRE')) {
      const res = dom.unwrapNodePreservingChildren(existingCode);
      if (res) {
        if (res.first && res.last) {
          dom.selectNodeSpan(editorEl, res.first, res.last);
        } else if (res.parent) {
          dom.selectNodeContentsAndCollapse(editorEl, res.parent, false);
        }
      }
      dom.notifyEditorChanged(editorEl);
      return true;
    }

    const codeEl = doc.createElement('code');
    if (range.collapsed) {
      // A zero-width space gives the caret a place to live inside the empty element.
      const zwsp = doc.createTextNode('​');
      codeEl.appendChild(zwsp);
      range.insertNode(codeEl);
      const inside = doc.createRange();
      inside.setStart(zwsp, 1);
      inside.collapse(true);
      dom.applyRange(editorEl, inside);
    } else {
      const frag = range.extractContents();
      if (typeof frag.querySelectorAll === 'function') {
        for (const nested of Array.from(frag.querySelectorAll('code'))) {
          dom.unwrapNodePreservingChildren(nested);
        }
      }
      codeEl.appendChild(frag);
      range.insertNode(codeEl);
      const selRange = doc.createRange();
      selRange.selectNodeContents(codeEl);
      dom.applyRange(editorEl, selRange);
    }

    dom.notifyEditorChanged(editorEl);
    return true;
  }

  /**
   * Converts a selection to plain text with line breaks for blocks and `<br>`,
   * used to prefill the code block popover.
   * @param {Range} range
   * @returns {string}
   */
  function extractRangePlainTextWithLineBreaks(range) {
    if (!range || range.collapsed) return '';
    let out = '';

    function walk(node) {
      for (let ch = node.firstChild; ch; ch = ch.nextSibling) {
        if (ch.nodeType === 3) {
          out += ch.data || ch.textContent || '';
          continue;
        }
        if (ch.nodeType !== 1) continue;
        const tag = ch.tagName.toUpperCase();
        if (tag === 'BR') {
          out += '\n';
          continue;
        }
        const isBlock = BLOCK_TAGS.has(tag);
        if (isBlock && out.length > 0 && !out.endsWith('\n')) out += '\n';
        walk(ch);
        if (isBlock && !out.endsWith('\n')) out += '\n';
      }
    }

    walk(range.cloneContents());
    return out.replace(/\n+$/, '');
  }

  function insertCodeSnippetAtSelection(editorEl, savedRange, rawCode, langId) {
    const range = dom.acquireEditableRange(editorEl, savedRange);
    if (!range) return false;

    const { doc } = dom.getDocAndSelection(editorEl);
    const nodes = dom.insertHtmlAtRange(doc, range, codeHighlight.buildCodeBlockHtml(rawCode, langId));
    const trailingLine = nodes[nodes.length - 1];
    if (trailingLine) dom.selectNodeContentsAndCollapse(editorEl, trailingLine, true);
    dom.notifyEditorChanged(editorEl);
    return true;
  }

  function insertEmojiAtSelection(editorEl, savedRange, emoji) {
    const clean = String(emoji || '').trim();
    if (!clean) return false;
    const range = dom.acquireEditableRange(editorEl, savedRange);
    if (!range) return false;

    const { doc } = dom.getDocAndSelection(editorEl);
    range.deleteContents();
    const textNode = doc.createTextNode(clean);
    range.insertNode(textNode);
    dom.placeCaretAfter(editorEl, textNode);
    dom.notifyEditorChanged(editorEl);
    return true;
  }

  /** Inserts `<hr>` followed by an empty line that receives the caret. */
  function insertHorizontalRule(editorEl) {
    const range = dom.acquireEditableRange(editorEl, null);
    if (!range) return false;

    const { doc } = dom.getDocAndSelection(editorEl);
    range.deleteContents();
    const hr = doc.createElement('hr');
    const afterDiv = doc.createElement('div');
    afterDiv.appendChild(doc.createElement('br'));
    range.insertNode(afterDiv);
    afterDiv.parentNode.insertBefore(hr, afterDiv);
    dom.selectNodeContentsAndCollapse(editorEl, afterDiv, true);
    dom.notifyEditorChanged(editorEl);
    return true;
  }

  const api = {
    execInlineCommand,
    toggleBlockquote,
    toggleInlineCode,
    extractRangePlainTextWithLineBreaks,
    insertCodeSnippetAtSelection,
    insertEmojiAtSelection,
    insertHorizontalRule,
  };

  editor.blocks = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
