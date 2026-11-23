/**
 * Buddy for Zammad – Link commands (insert, edit, unlink) with URL hardening.
 *
 * Only `https:`, `http:`, `mailto:`, `tel:`, anchors and relative paths are
 * accepted. Script-capable schemes (`javascript:`, `data:`, `vbscript:` …) are
 * always rejected before anything touches the editor.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const sanitizer = ns.sanitizer || (isNode ? require('../../format-guard/sanitizer.js') : null);
  const dom = editor.dom || (isNode ? require('./dom.js') : null);

  const BLOCKED_SCHEMES = /^(javascript|data|vbscript|file|blob):/i;
  const EMAIL_PATTERN = /^[^\s@/:]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_PATTERN = /^\+[0-9][0-9\s()./-]{5,}$/;
  const BARE_HOST_PATTERN = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/:?#].*)?$/;

  function hasHostname(url) {
    try {
      return Boolean(new URL(url).hostname);
    } catch (_) {
      return false;
    }
  }

  /**
   * Normalizes user input into a safe link target.
   * `example.com` -> `https://example.com`, `a@b.c` -> `mailto:a@b.c`,
   * `+49 …` -> `tel:+49…`.
   * @param {string} rawInput
   * @returns {{ ok: boolean, url: string }}
   */
  function normalizeSafeLinkUrl(rawInput) {
    const rejected = { ok: false, url: '' };
    if (!rawInput || typeof rawInput !== 'string') return rejected;
    const trimmed = rawInput.trim();
    if (!trimmed || BLOCKED_SCHEMES.test(trimmed)) return rejected;

    if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
      return { ok: true, url: trimmed };
    }

    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
      if (sanitizer && !sanitizer.isSafeHref(trimmed)) return rejected;
      if (/^https?:/i.test(trimmed) && !hasHostname(trimmed)) return rejected;
      return { ok: true, url: trimmed };
    }

    if (EMAIL_PATTERN.test(trimmed)) return { ok: true, url: `mailto:${trimmed}` };
    if (PHONE_PATTERN.test(trimmed)) return { ok: true, url: `tel:${trimmed.replace(/\s+/g, '')}` };

    if (BARE_HOST_PATTERN.test(trimmed) || /^localhost([:/].*)?$/i.test(trimmed)) {
      const candidate = `https://${trimmed}`;
      if (hasHostname(candidate)) return { ok: true, url: candidate };
    }

    return rejected;
  }

  /**
   * Describes the link under the selection so the popover can prefill its form.
   * @returns {{ anchorEl: HTMLAnchorElement | null, href: string, text: string, hasSelection: boolean }}
   */
  function inspectLinkAtSelection(editorEl, savedRange) {
    const range = savedRange || dom.saveSelectionRange(editorEl);
    if (!range) return { anchorEl: null, href: '', text: '', hasSelection: false };

    const anchorEl = dom.findClosestTag(range.commonAncestorContainer, editorEl, 'A');
    if (anchorEl && !dom.isInsideSignature(anchorEl, editorEl)) {
      return {
        anchorEl,
        href: anchorEl.getAttribute('href') || '',
        text: anchorEl.textContent || '',
        hasSelection: true,
      };
    }
    return {
      anchorEl: null,
      href: '',
      text: range.collapsed ? '' : range.toString(),
      hasSelection: !range.collapsed,
    };
  }

  /**
   * Creates a link from the selection or updates the link under the caret.
   * @returns {{ ok: true, url: string } | { ok: false, errorKey: string }}
   */
  function applyLink(editorEl, savedRange, rawUrl, customLabel) {
    const invalid = { ok: false, errorKey: 'linkInvalidErr' };
    const normalized = normalizeSafeLinkUrl(rawUrl);
    if (!normalized.ok) return invalid;

    const range = dom.acquireEditableRange(editorEl, savedRange);
    if (!range) return invalid;

    const { doc } = dom.getDocAndSelection(editorEl);
    const existingAnchor = dom.findClosestTag(range.commonAncestorContainer, editorEl, 'A');
    const label = typeof customLabel === 'string' ? customLabel.trim() : '';

    if (existingAnchor && !dom.isInsideSignature(existingAnchor, editorEl)) {
      existingAnchor.setAttribute('href', normalized.url);
      if (label && label !== existingAnchor.textContent) existingAnchor.textContent = label;
      dom.placeCaretAfter(editorEl, existingAnchor);
      dom.notifyEditorChanged(editorEl);
      return { ok: true, url: normalized.url };
    }

    const a = doc.createElement('a');
    a.setAttribute('href', normalized.url);

    if (!range.collapsed) {
      if (label && label !== range.toString()) {
        range.deleteContents();
        a.textContent = label;
      } else {
        a.appendChild(range.extractContents());
      }
    } else {
      a.textContent = label || normalized.url.replace(/^mailto:/i, '');
    }

    range.insertNode(a);
    dom.placeCaretAfter(editorEl, a);
    dom.notifyEditorChanged(editorEl);
    return { ok: true, url: normalized.url };
  }

  function removeLink(editorEl, savedRange) {
    const range = dom.acquireEditableRange(editorEl, savedRange);
    if (!range) return false;

    const existingAnchor = dom.findClosestTag(range.commonAncestorContainer, editorEl, 'A');
    if (existingAnchor) {
      const res = dom.unwrapNodePreservingChildren(existingAnchor);
      if (res && res.last) dom.placeCaretAfter(editorEl, res.last);
      dom.notifyEditorChanged(editorEl);
      return true;
    }

    const { doc } = dom.getDocAndSelection(editorEl);
    if (!doc || typeof doc.execCommand !== 'function') return false;
    try {
      doc.execCommand('unlink', false, null);
      dom.notifyEditorChanged(editorEl);
      return true;
    } catch (_) {
      return false;
    }
  }

  const api = { normalizeSafeLinkUrl, inspectLinkAtSelection, applyLink, removeLink };

  editor.links = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
