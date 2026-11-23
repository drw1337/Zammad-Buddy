/**
 * Buddy for Zammad – Code block popover.
 *
 * Language picker + textarea, prefilled with the selected text. `Tab` inserts
 * two spaces, `Ctrl+Enter` inserts the block.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const ui = (ns.wysiwygUi = ns.wysiwygUi || {});
  const frame = ui.popoverFrame;

  function render(ctx) {
    const { doc, commands, state } = ctx;
    const prefilledText = ctx.savedRange ? commands.extractRangePlainTextWithLineBreaks(ctx.savedRange) : '';

    frame.appendHead(ctx, 'popTitleCode');

    const selLang = frame.el(doc, 'select', 'zb-pop-select');
    for (const lang of commands.CODE_LANGUAGES) {
      const opt = frame.el(doc, 'option', null, lang.label);
      opt.value = lang.id;
      opt.selected = lang.id === state.lastCodeLang;
      selLang.appendChild(opt);
    }
    selLang.addEventListener('change', () => {
      state.lastCodeLang = selLang.value;
    });

    const codeArea = frame.el(doc, 'textarea', 'zb-pop-textarea');
    codeArea.rows = 5;
    codeArea.placeholder = ctx.t('codeInputPlaceholder');
    codeArea.value = prefilledText;
    codeArea.spellcheck = false;
    codeArea.setAttribute('aria-label', ctx.t('popTitleCode'));

    const { form, body, foot } = frame.form(ctx, () => {
      state.lastCodeLang = selLang.value;
      const range = ctx.savedRange;
      const snippet = codeArea.value;
      ctx.close(false);
      commands.insertCodeSnippetAtSelection(ctx.editorEl, range, snippet, state.lastCodeLang);
      ctx.refresh();
    });

    codeArea.addEventListener('keydown', (ev) => {
      if (ev.key === 'Tab') {
        ev.preventDefault();
        const start = codeArea.selectionStart;
        const end = codeArea.selectionEnd;
        codeArea.value = `${codeArea.value.slice(0, start)}  ${codeArea.value.slice(end)}`;
        codeArea.selectionStart = codeArea.selectionEnd = start + 2;
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault();
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    const topRow = frame.el(doc, 'div', 'zb-code-top-row');
    const langField = frame.field(ctx, 'codeLangLabel', selLang, 'code-lang');
    // The language row is laid out horizontally; unwrap the field container.
    while (langField.firstChild) topRow.appendChild(langField.firstChild);
    body.appendChild(topRow);
    body.appendChild(codeArea);

    const cancelBtn = frame.button(ctx, ctx.t('linkCancelBtn'), 'secondary');
    cancelBtn.addEventListener('click', () => ctx.close(true));
    const hint = frame.el(doc, 'span', 'zb-pop-hint', 'Ctrl+Enter');
    frame.footActions(ctx, foot, [hint], [cancelBtn, frame.button(ctx, ctx.t('codeInsertBtn'), 'primary')]);

    setTimeout(() => codeArea.focus(), 0);
  }

  ui.popovers = ui.popovers || {};
  ui.popovers.code = { render };
})(typeof globalThis !== 'undefined' ? globalThis : window);
