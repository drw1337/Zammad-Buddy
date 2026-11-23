/**
 * Buddy for Zammad – Link popover (`Ctrl+K`).
 *
 * Edits the link under the caret or creates one from the selection. URL
 * validation happens in the editor command; invalid input shows an inline error.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const ui = (ns.wysiwygUi = ns.wysiwygUi || {});
  const frame = ui.popoverFrame;

  function textInput(doc, placeholder, value) {
    const input = frame.el(doc, 'input', 'zb-pop-input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.value = value || '';
    input.autocomplete = 'off';
    return input;
  }

  function render(ctx) {
    const { doc, commands, editorEl } = ctx;
    const linkInfo = commands.inspectLinkAtSelection(editorEl, ctx.savedRange);

    frame.appendHead(ctx, 'popTitleLink');

    const inputUrl = textInput(doc, ctx.t('linkUrlPlaceholder'), linkInfo.href);
    inputUrl.spellcheck = false;
    const inputText = textInput(doc, ctx.t('linkTextPlaceholder'), linkInfo.text);
    const errEl = frame.el(doc, 'div', 'zb-pop-error');
    errEl.setAttribute('role', 'alert');
    errEl.hidden = true;

    const { body, foot } = frame.form(ctx, () => {
      const res = commands.applyLink(editorEl, ctx.savedRange, inputUrl.value, inputText.value);
      if (!res.ok) {
        errEl.textContent = ctx.t(res.errorKey || 'linkInvalidErr');
        errEl.hidden = false;
        inputUrl.setAttribute('aria-invalid', 'true');
        inputUrl.focus();
        return;
      }
      ctx.close(false);
      ctx.refresh();
    });

    body.appendChild(frame.field(ctx, 'linkUrlLabel', inputUrl, 'link-url'));
    body.appendChild(frame.field(ctx, 'linkTextLabel', inputText, 'link-text'));
    body.appendChild(errEl);

    const left = [];
    if (linkInfo.anchorEl) {
      const unlinkBtn = frame.button(ctx, ctx.t('linkRemoveBtn'), 'danger');
      unlinkBtn.addEventListener('click', () => {
        const range = ctx.savedRange;
        ctx.close(false);
        commands.removeLink(editorEl, range);
        ctx.refresh();
      });
      left.push(unlinkBtn);
    }

    const cancelBtn = frame.button(ctx, ctx.t('linkCancelBtn'), 'secondary');
    cancelBtn.addEventListener('click', () => ctx.close(true));
    frame.footActions(ctx, foot, left, [cancelBtn, frame.button(ctx, ctx.t('linkApplyBtn'), 'primary')]);

    setTimeout(() => {
      inputUrl.focus();
      inputUrl.select();
    }, 0);
  }

  ui.popovers = ui.popovers || {};
  ui.popovers.link = { render };
})(typeof globalThis !== 'undefined' ? globalThis : window);
