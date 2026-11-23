/**
 * Buddy for Zammad – In-place email preview.
 *
 * Shows the draft on a white background next to the (temporarily hidden)
 * editor, so agents working in dark mode can spot unreadable colors before
 * sending. The editor itself is never moved or replaced.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const ui = (ns.wysiwygUi = ns.wysiwygUi || {});

  /**
   * @param {{ doc: Document, editorEl: HTMLElement, commands: object,
   *           t: (key: string) => string, isInternal: () => boolean,
   *           onCloseRequest: () => void }} options
   */
  function createPreviewPane(options) {
    const { doc, editorEl, commands } = options;

    const pane = doc.createElement('div');
    pane.className = 'zb-email-preview';
    pane.setAttribute('data-zb-ui', 'email-preview');
    pane.hidden = true;

    const header = doc.createElement('div');
    header.className = 'zb-email-preview-header';
    const title = doc.createElement('span');
    title.className = 'zb-email-preview-title';
    const closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'zb-btn zb-email-preview-close';
    closeBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      options.onCloseRequest();
    });
    header.appendChild(title);
    header.appendChild(closeBtn);

    const canvas = doc.createElement('div');
    canvas.className = 'zb-email-preview-canvas';
    // Links in the preview are for reading only.
    canvas.addEventListener('click', (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest('a')) ev.preventDefault();
    });

    pane.appendChild(header);
    pane.appendChild(canvas);

    function render() {
      if (pane.hidden) return;
      title.textContent = options.t(options.isInternal() ? 'previewBannerInternal' : 'previewBannerPublic');
      closeBtn.textContent = options.t('previewCloseBtn');

      const safeHtml = commands.sanitizePreviewHtml(editorEl.innerHTML);
      const hasText = Boolean((editorEl.textContent || '').trim());
      const hasMedia = /<(img|table|hr)\b/i.test(safeHtml);

      if (!hasText && !hasMedia) {
        canvas.textContent = '';
        const empty = doc.createElement('div');
        empty.className = 'zb-email-preview-empty';
        empty.textContent = options.t('previewEmpty');
        canvas.appendChild(empty);
      } else {
        // Scrubbed by sanitizePreviewHtml (no scripts, handlers or script URLs).
        ns.safeHtml.setHtml(canvas, safeHtml);
      }
    }

    // Keep the preview live while the draft changes (e.g. text modules, uploads).
    const observer = new MutationObserver(render);
    observer.observe(editorEl, { childList: true, subtree: true, attributes: true, characterData: true });

    function setOpen(open) {
      pane.hidden = !open;
      editorEl.classList.toggle('zb-editor-preview-hidden', open);
      if (open) render();
    }

    function destroy() {
      observer.disconnect();
      editorEl.classList.remove('zb-editor-preview-hidden');
      if (pane.parentNode) pane.parentNode.removeChild(pane);
    }

    return { element: pane, setOpen, render, destroy };
  }

  ui.createPreviewPane = createPreviewPane;
})(typeof globalThis !== 'undefined' ? globalThis : window);
