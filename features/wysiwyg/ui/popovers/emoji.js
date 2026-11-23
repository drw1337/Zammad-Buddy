/**
 * Buddy for Zammad – Emoji picker with bilingual search and recently used emojis.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const ui = (ns.wysiwygUi = ns.wysiwygUi || {});
  const frame = ui.popoverFrame;

  function render(ctx) {
    const { doc, commands, editorEl, settings } = ctx;

    frame.appendHead(ctx, 'popTitleEmoji');
    const { body } = frame.sections(ctx, false);

    const searchInput = frame.el(doc, 'input', 'zb-pop-input zb-emoji-search');
    searchInput.type = 'text';
    searchInput.placeholder = ctx.t('emojiSearchPlaceholder');
    searchInput.setAttribute('aria-label', ctx.t('emojiSearchPlaceholder'));
    searchInput.autocomplete = 'off';

    function section(labelKey, gridClass) {
      const wrap = frame.el(doc, 'div', 'zb-emoji-section');
      const grid = frame.el(doc, 'div', gridClass);
      wrap.appendChild(frame.el(doc, 'div', 'zb-emoji-section-label', ctx.t(labelKey)));
      wrap.appendChild(grid);
      return { wrap, grid };
    }

    const recent = section('emojiRecentLabel', 'zb-emoji-grid');
    const all = section('emojiAllLabel', 'zb-emoji-grid zb-emoji-grid--scroll');

    function insert(ch) {
      const range = ctx.savedRange;
      ctx.close(false);
      commands.insertEmojiAtSelection(editorEl, range, ch);
      if (ns.storage && typeof ns.storage.pushRecentEmoji === 'function') {
        ns.storage.pushRecentEmoji(ch);
      }
      ctx.refresh();
    }

    function emojiButton(ch) {
      const b = frame.keepSelection(frame.el(doc, 'button', 'zb-emoji-btn', ch));
      b.type = 'button';
      b.addEventListener('click', (ev) => {
        ev.preventDefault();
        insert(ch);
      });
      return b;
    }

    function renderGrids(query) {
      const recents = Array.isArray(settings.recentEmojis) ? settings.recentEmojis : [];
      const showRecent = !String(query || '').trim() && recents.length > 0;
      recent.wrap.hidden = !showRecent;
      recent.grid.textContent = '';
      if (showRecent) for (const em of recents) recent.grid.appendChild(emojiButton(em));

      all.grid.textContent = '';
      for (const item of commands.filterEmojis(query)) all.grid.appendChild(emojiButton(item.ch));
    }

    searchInput.addEventListener('input', () => renderGrids(searchInput.value));
    searchInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        ctx.close(true);
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        const first = all.grid.querySelector('.zb-emoji-btn');
        if (first) first.click();
      }
    });

    renderGrids('');
    body.appendChild(searchInput);
    body.appendChild(recent.wrap);
    body.appendChild(all.wrap);
    setTimeout(() => searchInput.focus(), 0);
  }

  ui.popovers = ui.popovers || {};
  ui.popovers.emoji = { render };
})(typeof globalThis !== 'undefined' ? globalThis : window);
