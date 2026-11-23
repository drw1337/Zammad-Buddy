/**
 * Buddy for Zammad – 6×6 table size picker.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const ui = (ns.wysiwygUi = ns.wysiwygUi || {});
  const frame = ui.popoverFrame;

  const GRID_SIZE = 6;
  const DEFAULT_SIZE = 3;

  function render(ctx) {
    const { doc, commands, editorEl, state } = ctx;

    frame.appendHead(ctx, 'popTitleTable');
    const { body, foot } = frame.sections(ctx, true);

    const dimLabel = frame.el(doc, 'div', 'zb-table-dim-label');
    dimLabel.setAttribute('aria-live', 'polite');
    const grid = frame.el(doc, 'div', 'zb-table-grid');
    const cells = [];

    function highlight(rows, cols) {
      dimLabel.textContent = ctx.t('tableDimensions', { rows, cols });
      for (const cell of cells) {
        cell.el.classList.toggle('is-lit', cell.r <= rows && cell.c <= cols);
      }
    }

    for (let r = 1; r <= GRID_SIZE; r++) {
      for (let c = 1; c <= GRID_SIZE; c++) {
        const cellBtn = frame.keepSelection(frame.el(doc, 'button', 'zb-table-cell'));
        cellBtn.type = 'button';
        cellBtn.setAttribute('aria-label', ctx.t('tableDimensions', { rows: r, cols: c }));
        cellBtn.addEventListener('mouseenter', () => highlight(r, c));
        cellBtn.addEventListener('focus', () => highlight(r, c));
        cellBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          const range = ctx.savedRange;
          ctx.close(false);
          commands.insertTableAtSelection(editorEl, range, r, c, state.tableWithHeader);
          ctx.refresh();
        });
        cells.push({ r, c, el: cellBtn });
        grid.appendChild(cellBtn);
      }
    }
    highlight(DEFAULT_SIZE, DEFAULT_SIZE);

    const headerOpt = frame.el(doc, 'label', 'zb-table-header-opt');
    const chkHdr = frame.el(doc, 'input');
    chkHdr.type = 'checkbox';
    chkHdr.checked = state.tableWithHeader;
    chkHdr.addEventListener('change', () => {
      state.tableWithHeader = chkHdr.checked;
    });
    headerOpt.appendChild(chkHdr);
    headerOpt.appendChild(frame.el(doc, 'span', null, ctx.t('tableHeaderToggle')));

    body.appendChild(dimLabel);
    body.appendChild(grid);
    foot.appendChild(headerOpt);
  }

  ui.popovers = ui.popovers || {};
  ui.popovers.table = { render };
})(typeof globalThis !== 'undefined' ? globalThis : window);
