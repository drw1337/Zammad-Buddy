/**
 * Buddy for Zammad – Tables and Tab key navigation.
 *
 * Tables are emitted as bare semantic `<table>/<thead>/<tbody>` markup without
 * inline styles, so they pass Zammad's sanitizer and the Format Guard.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const dom = editor.dom || (isNode ? require('./dom.js') : null);
  const lists = editor.lists || (isNode ? require('./lists.js') : null);

  const MAX_ROWS = 12;
  const MAX_COLS = 10;

  function clampInt(value, min, max, fallback) {
    return Math.max(min, Math.min(max, parseInt(value, 10) || fallback));
  }

  /**
   * @param {number} rows total rows including the optional header row
   * @param {number} cols
   * @param {{ withHeader?: boolean }} [options]
   * @returns {string} HTML followed by an empty line for the caret
   */
  function buildTableHtml(rows, cols, options) {
    const safeRows = clampInt(rows, 1, MAX_ROWS, 3);
    const safeCols = clampInt(cols, 1, MAX_COLS, 3);
    const withHeader = !options || options.withHeader !== false;
    const row = (cellTag) => `<tr>${`<${cellTag}><br></${cellTag}>`.repeat(safeCols)}</tr>`;

    let html = '<table>';
    let bodyRows = safeRows;
    if (withHeader) {
      html += `<thead>${row('th')}</thead>`;
      bodyRows = Math.max(1, safeRows - 1);
    }
    html += `<tbody>${row('td').repeat(bodyRows)}</tbody></table><div><br></div>`;
    return html;
  }

  function insertTableAtSelection(editorEl, savedRange, rows, cols, withHeader) {
    const range = dom.acquireEditableRange(editorEl, savedRange);
    if (!range) return false;

    const { doc } = dom.getDocAndSelection(editorEl);
    const nodes = dom.insertHtmlAtRange(doc, range, buildTableHtml(rows, cols, { withHeader }));
    const tableEl = nodes.find((n) => n.nodeType === 1 && n.tagName.toUpperCase() === 'TABLE');
    const firstCell = tableEl && tableEl.querySelector('th, td');
    if (firstCell) dom.selectNodeContentsAndCollapse(editorEl, firstCell, true);

    dom.notifyEditorChanged(editorEl);
    return true;
  }

  function appendRowAndFocus(editorEl, doc, table, cell) {
    const currentRow = dom.findClosestTag(cell, table, 'TR');
    const colCount = currentRow ? currentRow.children.length : 1;
    const tbody = table.querySelector('tbody') || table;
    const newRow = doc.createElement('tr');
    for (let c = 0; c < colCount; c++) {
      const td = doc.createElement('td');
      td.appendChild(doc.createElement('br'));
      newRow.appendChild(td);
    }
    tbody.appendChild(newRow);
    if (newRow.firstChild) dom.selectNodeContentsAndCollapse(editorEl, newRow.firstChild, true);
    dom.notifyEditorChanged(editorEl);
  }

  /**
   * Handles `Tab` / `Shift+Tab`: moves between table cells (adding a row after
   * the last cell) and indents / outdents list items.
   * @returns {boolean} true if the key was consumed
   */
  function handleTabNavigation(editorEl, isShiftKey) {
    if (!editorEl) return false;
    const { doc, sel } = dom.getDocAndSelection(editorEl);
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) return false;
    if (dom.isInsideSignature(range.commonAncestorContainer, editorEl)) return false;

    const cell = dom.findClosestTag(range.commonAncestorContainer, editorEl, ['TD', 'TH']);
    const table = cell && dom.findClosestTag(cell, editorEl, 'TABLE');
    if (table) {
      const cells = Array.from(table.querySelectorAll('th, td'));
      const idx = cells.indexOf(cell);
      if (idx !== -1) {
        if (!isShiftKey && idx + 1 < cells.length) {
          dom.selectNodeContentsAndCollapse(editorEl, cells[idx + 1], false);
        } else if (!isShiftKey) {
          appendRowAndFocus(editorEl, doc, table, cell);
        } else if (idx > 0) {
          dom.selectNodeContentsAndCollapse(editorEl, cells[idx - 1], false);
        }
        // Shift+Tab in the first cell is swallowed so focus stays in the editor.
        return true;
      }
    }

    if (dom.findClosestTag(range.commonAncestorContainer, editorEl, 'LI')) {
      return isShiftKey ? lists.outdentListOrBlock(editorEl) : lists.indentListOrBlock(editorEl);
    }
    return false;
  }

  const api = { buildTableHtml, insertTableAtSelection, handleTabNavigation };

  editor.tables = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
