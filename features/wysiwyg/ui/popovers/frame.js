/**
 * Buddy for Zammad – Shared popover building blocks.
 *
 * Every toolbar popover uses the same frame as the advanced search flyout:
 * a title row with a close button, a body, and an optional footer with the
 * actions (secondary left of primary). Inputs are real Light-DOM elements so
 * Zammad's global keyboard shortcuts never steal their focus.
 *
 * A popover module exports `render(ctx)` and receives:
 *   ctx.doc, ctx.editorEl, ctx.host     document, editor, popover container
 *   ctx.commands                        editor command facade
 *   ctx.settings, ctx.t(key, params)    current settings and translator
 *   ctx.savedRange                      selection saved when the popover opened
 *   ctx.state                           per-editor memory (last language, …)
 *   ctx.close(restoreFocus)             closes the popover
 *   ctx.refresh()                       re-evaluates toolbar button states
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const ui = (ns.wysiwygUi = ns.wysiwygUi || {});

  let idCounter = 0;

  /** Unique, scoped element ids for label/input pairs. */
  function uniqueId(prefix) {
    idCounter += 1;
    return `zb-${prefix}-${idCounter}`;
  }

  function el(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** Appends the title row (title + close button) to `ctx.host`. */
  function appendHead(ctx, titleKey) {
    const head = el(ctx.doc, 'div', 'zb-pop-head');
    const closeBtn = el(ctx.doc, 'button', 'zb-pop-close', '×');
    closeBtn.type = 'button';
    closeBtn.title = ctx.t('popCloseTitle');
    closeBtn.setAttribute('aria-label', ctx.t('popCloseTitle'));
    closeBtn.addEventListener('mousedown', (ev) => ev.preventDefault());
    closeBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ctx.close(true);
    });
    // Shown by the toolbar while the popover sits at a custom (dragged) position.
    const resetBtn = el(ctx.doc, 'button', 'zb-pop-close zb-pop-reset', '⤺');
    resetBtn.type = 'button';
    resetBtn.hidden = true;
    resetBtn.title = ctx.t('resetPositionTitle');
    resetBtn.setAttribute('aria-label', ctx.t('resetPositionTitle'));
    resetBtn.addEventListener('mousedown', (ev) => ev.preventDefault());
    resetBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (ctx.resetPosition) ctx.resetPosition();
    });

    const title = el(ctx.doc, 'span', 'zb-pop-title', ctx.t(titleKey));
    title.title = ctx.t('moveHint');
    const actions = el(ctx.doc, 'span', 'zb-pop-head-actions');
    actions.append(resetBtn, closeBtn);
    head.append(title, actions);
    ctx.host.appendChild(head);
    return head;
  }

  /**
   * @param {'primary' | 'secondary' | 'danger'} variant primary buttons submit their form
   */
  function button(ctx, label, variant) {
    const btn = el(ctx.doc, 'button', `zb-pop-btn zb-pop-btn--${variant}`, label);
    btn.type = variant === 'primary' ? 'submit' : 'button';
    return btn;
  }

  /** Label + control pair with matching `for`/`id`. */
  function field(ctx, labelKey, control, idPrefix) {
    const wrap = el(ctx.doc, 'div', 'zb-pop-field');
    const label = el(ctx.doc, 'label', 'zb-pop-label', ctx.t(labelKey));
    control.id = uniqueId(idPrefix);
    label.htmlFor = control.id;
    wrap.appendChild(label);
    wrap.appendChild(control);
    return wrap;
  }

  /**
   * Creates `<form>` with body and footer. Escape closes the popover and the
   * submit handler is wired with `preventDefault`.
   */
  function form(ctx, onSubmit) {
    const formEl = el(ctx.doc, 'form', 'zb-pop-form');
    formEl.noValidate = true;
    const body = el(ctx.doc, 'div', 'zb-pop-body');
    const foot = el(ctx.doc, 'div', 'zb-pop-foot');
    formEl.appendChild(body);
    formEl.appendChild(foot);
    formEl.addEventListener('submit', (ev) => {
      ev.preventDefault();
      onSubmit();
    });
    formEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        ctx.close(true);
      }
    });
    ctx.host.appendChild(formEl);
    return { form: formEl, body, foot };
  }

  /** Footer action groups: `left` (e.g. destructive) and `right` (cancel + primary). */
  function footActions(ctx, foot, left, right) {
    const leftWrap = el(ctx.doc, 'div', 'zb-pop-foot-left');
    const rightWrap = el(ctx.doc, 'div', 'zb-pop-foot-right');
    for (const node of left || []) leftWrap.appendChild(node);
    for (const node of right || []) rightWrap.appendChild(node);
    foot.appendChild(leftWrap);
    foot.appendChild(rightWrap);
  }

  /** Body + footer without a form (pickers that act on click). */
  function sections(ctx, withFoot) {
    const body = el(ctx.doc, 'div', 'zb-pop-body');
    ctx.host.appendChild(body);
    let foot = null;
    if (withFoot) {
      foot = el(ctx.doc, 'div', 'zb-pop-foot');
      ctx.host.appendChild(foot);
    }
    return { body, foot };
  }

  /** Buttons inside pickers must not steal the editor selection on mousedown. */
  function keepSelection(node) {
    node.addEventListener('mousedown', (ev) => ev.preventDefault());
    return node;
  }

  ui.popoverFrame = { uniqueId, el, appendHead, button, field, form, footActions, sections, keepSelection };
  ui.popovers = ui.popovers || {};
})(typeof globalThis !== 'undefined' ? globalThis : window);
