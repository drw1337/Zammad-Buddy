/**
 * Buddy for Zammad – Highlight marker popover (internal notes only).
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const ui = (ns.wysiwygUi = ns.wysiwygUi || {});
  const frame = ui.popoverFrame;

  function render(ctx) {
    const { doc, commands, editorEl } = ctx;
    const current = commands.queryToolbarState(editorEl).highlightColor;

    frame.appendHead(ctx, 'popTitleHighlight');
    const { body, foot } = frame.sections(ctx, true);

    function run(action) {
      const range = ctx.savedRange;
      ctx.close(false);
      action(range);
      ctx.refresh();
    }

    const swatchRow = frame.el(doc, 'div', 'zb-hl-swatch-row');
    for (const entry of commands.HIGHLIGHT_PALETTE) {
      const swatch = frame.keepSelection(frame.el(doc, 'button', 'zb-hl-choice'));
      swatch.type = 'button';
      swatch.classList.toggle('is-selected', current === entry.hex);
      swatch.style.backgroundColor = entry.hex;
      swatch.title = ctx.t(entry.i18nKey);
      swatch.setAttribute('aria-label', ctx.t(entry.i18nKey));
      swatch.setAttribute('aria-pressed', String(current === entry.hex));
      swatch.addEventListener('click', (ev) => {
        ev.preventDefault();
        run((range) => commands.applyNoteHighlight(editorEl, range, entry.hex));
      });
      swatchRow.appendChild(swatch);
    }

    const removeBtn = frame.keepSelection(frame.button(ctx, ctx.t('hlRemove'), 'secondary'));
    removeBtn.classList.add('zb-hl-remove-btn');
    removeBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      run((range) => commands.removeNoteHighlight(editorEl, range));
    });

    body.appendChild(swatchRow);
    foot.appendChild(removeBtn);
  }

  ui.popovers = ui.popovers || {};
  ui.popovers.highlight = { render };
})(typeof globalThis !== 'undefined' ? globalThis : window);
