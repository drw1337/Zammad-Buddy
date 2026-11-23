/**
 * Buddy for Zammad – Word-style nested lists.
 *
 * Indent creates real nested lists (`<ul><li>…<ul><li>…</li></ul></li></ul>`),
 * which email clients render correctly – unlike the `margin-left` blocks that
 * the browser's native `indent` command produces.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const dom = editor.dom || (isNode ? require('./dom.js') : null);
  const blocks = editor.blocks || (isNode ? require('./blocks.js') : null);

  function isListTag(el) {
    if (!el || el.nodeType !== 1) return false;
    const t = el.tagName.toUpperCase();
    return t === 'UL' || t === 'OL';
  }

  function isLi(node) {
    return Boolean(node && node.nodeType === 1 && node.tagName.toUpperCase() === 'LI');
  }

  function findPreviousSiblingLi(li) {
    for (let prev = li.previousSibling; prev; prev = prev.previousSibling) {
      if (isLi(prev)) return prev;
    }
    return null;
  }

  function findLastDirectChildList(li) {
    const children = li.children || [];
    for (let i = children.length - 1; i >= 0; i--) {
      if (isListTag(children[i])) return children[i];
    }
    return null;
  }

  function removeIfEmpty(list) {
    if (list && list.parentNode && (list.children || []).length === 0) {
      list.parentNode.removeChild(list);
    }
  }

  /** Returns the innermost list items touched by the selection (signature excluded). */
  function collectSelectedListItems(editorEl, range) {
    const singleLi = dom.findClosestTag(range.commonAncestorContainer, editorEl, 'LI');
    if (singleLi) return [singleLi];
    if (range.collapsed || typeof editorEl.querySelectorAll !== 'function') return [];

    const hits = Array.from(editorEl.querySelectorAll('li')).filter(
      (li) =>
        !dom.isInsideSignature(li, editorEl) &&
        typeof range.intersectsNode === 'function' &&
        range.intersectsNode(li)
    );
    return hits.filter((li) => !hits.some((other) => other !== li && li.contains(other)));
  }

  /**
   * Moves `li` one level deeper: into the previous item's sub-list, or – for the
   * first item – into a new nested list so the click always has a visible effect.
   */
  function indentListItemDom(doc, li) {
    const parentList = li && li.parentNode;
    if (!isListTag(parentList)) return false;

    const listTagName = parentList.tagName.toLowerCase();
    const prevLi = findPreviousSiblingLi(li);

    if (prevLi) {
      let subList = findLastDirectChildList(prevLi);
      if (!subList) {
        subList = doc.createElement(listTagName);
        prevLi.appendChild(subList);
      }
      subList.appendChild(li);
      return true;
    }

    const nestedList = doc.createElement(listTagName);
    parentList.insertBefore(nestedList, li);
    nestedList.appendChild(li);
    return true;
  }

  /**
   * Moves `li` one level up. On the top level the item leaves the list and
   * becomes a plain line (`<div>`); following items stay in a split-off list.
   */
  function outdentListItemDom(doc, li) {
    const parentList = li && li.parentNode;
    if (!isListTag(parentList)) return false;
    const grandParent = parentList.parentNode;
    if (!grandParent) return false;

    // Case 1: classic sub-list inside a parent <li>.
    if (isLi(grandParent)) {
      const outerList = grandParent.parentNode;
      if (!isListTag(outerList)) return false;

      // Following siblings become children of the outdented item (Word behavior).
      const trailingLis = [];
      for (let sib = li.nextSibling; sib; sib = sib.nextSibling) {
        if (isLi(sib)) trailingLis.push(sib);
      }
      if (trailingLis.length > 0) {
        let ownSub = findLastDirectChildList(li);
        if (!ownSub) {
          ownSub = doc.createElement(parentList.tagName.toLowerCase());
          li.appendChild(ownSub);
        }
        for (const tLi of trailingLis) ownSub.appendChild(tLi);
      }

      outerList.insertBefore(li, grandParent.nextSibling);
      removeIfEmpty(parentList);
      return true;
    }

    // Case 2: list nested directly in a list (created by indenting a first item).
    if (isListTag(grandParent)) {
      grandParent.insertBefore(li, parentList);
      removeIfEmpty(parentList);
      return true;
    }

    // Case 3: top level -> turn the item into a normal line.
    const trailingItems = [];
    for (let after = li.nextSibling; after; after = after.nextSibling) trailingItems.push(after);

    const lineDiv = doc.createElement('div');
    while (li.firstChild) lineDiv.appendChild(li.firstChild);
    if (!lineDiv.firstChild) lineDiv.appendChild(doc.createElement('br'));
    parentList.removeChild(li);

    let afterList = null;
    if (trailingItems.length > 0) {
      afterList = doc.createElement(parentList.tagName.toLowerCase());
      for (const item of trailingItems) afterList.appendChild(item);
    }

    const refNext = parentList.nextSibling;
    grandParent.insertBefore(lineDiv, refNext);
    if (afterList && (afterList.children || []).length > 0) {
      grandParent.insertBefore(afterList, refNext);
    }
    removeIfEmpty(parentList);
    return true;
  }

  /** Re-applies the original selection boundaries after the DOM was restructured. */
  function restoreBoundaries(editorEl, bounds, fallbackNode) {
    const { doc, sel } = dom.getDocAndSelection(editorEl);
    if (!sel || !editorEl.contains(bounds.startC) || !editorEl.contains(bounds.endC)) return;
    try {
      const next = doc.createRange();
      next.setStart(bounds.startC, bounds.startO);
      next.setEnd(bounds.endC, bounds.endO);
      dom.applyRange(editorEl, next);
    } catch (_) {
      if (fallbackNode) dom.selectNodeContentsAndCollapse(editorEl, fallbackNode, false);
    }
  }

  function shiftListItems(editorEl, direction) {
    const range = dom.acquireEditableRange(editorEl, null);
    if (!range) return { range: null, handled: false, changed: false };

    const items = collectSelectedListItems(editorEl, range);
    if (items.length === 0) return { range, handled: false, changed: false };

    const { doc } = dom.getDocAndSelection(editorEl);
    const bounds = {
      startC: range.startContainer,
      startO: range.startOffset,
      endC: range.endContainer,
      endO: range.endOffset,
    };

    let changed = false;
    if (direction > 0) {
      for (const li of items) changed = indentListItemDom(doc, li) || changed;
    } else {
      // Back to front keeps sibling order stable.
      for (let i = items.length - 1; i >= 0; i--) changed = outdentListItemDom(doc, items[i]) || changed;
    }

    if (changed) {
      restoreBoundaries(editorEl, bounds, direction > 0 ? items[items.length - 1] : null);
      dom.notifyEditorChanged(editorEl);
    }
    return { range, handled: true, changed };
  }

  /** Indents list items; outside of lists the paragraph is quoted instead. */
  function indentListOrBlock(editorEl) {
    if (!editorEl) return false;
    const res = shiftListItems(editorEl, 1);
    if (!res.range) return false;
    return res.handled ? res.changed : blocks.toggleBlockquote(editorEl);
  }

  /** Outdents list items; outside of lists an existing blockquote is removed. */
  function outdentListOrBlock(editorEl) {
    if (!editorEl) return false;
    const res = shiftListItems(editorEl, -1);
    if (!res.range) return false;
    if (res.handled) return res.changed;
    const quote = dom.findClosestTag(res.range.commonAncestorContainer, editorEl, 'BLOCKQUOTE');
    return quote ? blocks.toggleBlockquote(editorEl) : false;
  }

  const api = { indentListItemDom, outdentListItemDom, indentListOrBlock, outdentListOrBlock };

  editor.lists = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
