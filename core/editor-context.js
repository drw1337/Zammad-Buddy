/**
 * Buddy for Zammad – Editor context: public reply or internal note?
 *
 * Reads Zammad's article settings next to an editor (hidden `internal` field,
 * channel `type`, CSS / data markers) and watches them for changes, e.g. when
 * an agent switches a draft from "internal note" to "public email".
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const zammadDom = ns.zammadDom || (isNode ? require('./zammad-dom.js') : null);

  const WATCHED_ATTRIBUTES = [
    'class',
    'value',
    'checked',
    'data-internal',
    'data-visibility',
    'data-type',
    'aria-pressed',
    'aria-selected',
  ];

  function hasClassName(el, cls) {
    if (!el || el.nodeType !== 1) return false;
    if (el.classList && typeof el.classList.contains === 'function') return el.classList.contains(cls);
    return String((el.getAttribute && el.getAttribute('class')) || '')
      .split(/\s+/)
      .includes(cls);
  }

  /** Depth-first search over element children (works in the MiniDOM test parser too). */
  function findDescendant(node, predicate) {
    for (const ch of node.children || []) {
      if (predicate(ch)) return ch;
      const hit = findDescendant(ch, predicate);
      if (hit) return hit;
    }
    return null;
  }

  /** The element holding the editor's article settings (falls back to the closest form). */
  function findArticleContainer(editorEl) {
    let fallbackForm = null;
    for (let cur = editorEl ? editorEl.parentNode : null; cur && cur.nodeType === 1; cur = cur.parentNode) {
      if (zammadDom.SELECTORS.articleContainerClasses.some((cls) => hasClassName(cur, cls))) return cur;
      if (!fallbackForm && cur.tagName && cur.tagName.toUpperCase() === 'FORM') fallbackForm = cur;
    }
    return fallbackForm || (editorEl ? editorEl.parentElement || editorEl.parentNode : null);
  }

  function findNamedField(containerEl, fieldName) {
    if (!containerEl) return null;
    if (typeof containerEl.querySelector === 'function') {
      try {
        const direct = containerEl.querySelector(`[name="${fieldName}"]`);
        if (direct) return direct;
      } catch (_) {
        // Fall back to the manual walk below (MiniDOM has no attribute selectors).
      }
    }
    return findDescendant(containerEl, (el) => el.getAttribute && el.getAttribute('name') === fieldName);
  }

  function fieldValue(field) {
    if (field.value !== undefined) return field.value;
    return (field.getAttribute && field.getAttribute('value')) || '';
  }

  /** Reads the hidden / checkbox `internal` field. */
  function readInternalField(field) {
    const type = String(field.type || (field.getAttribute && field.getAttribute('type')) || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      const checked = typeof field.checked === 'boolean' ? field.checked : field.hasAttribute('checked');
      const value =
        field.value !== undefined && field.value !== ''
          ? String(field.value)
          : (field.getAttribute && field.getAttribute('value')) || 'true';
      return Boolean(checked) && !/^(false|0|no)$/i.test(value.trim());
    }
    return /^(true|1|yes|on)$/i.test(String(fieldValue(field) || '').trim());
  }

  /** Fallback without an `internal` field: class / data markers on ancestors and siblings. */
  function readInternalMarkers(editorEl, containerEl) {
    for (let cur = editorEl; cur && cur.nodeType === 1; cur = cur.parentNode) {
      const dataInt = cur.getAttribute && cur.getAttribute('data-internal');
      const dataVis = cur.getAttribute && cur.getAttribute('data-visibility');
      if (dataInt === 'false' || dataVis === 'public') break;
      if (hasClassName(cur, 'is-internal') || dataInt === 'true' || dataVis === 'internal') return true;
      if (cur === containerEl) break;
    }
    // .textBubble may be a sibling or child inside the same article container.
    if (containerEl && containerEl !== editorEl) {
      return Array.from(containerEl.children || []).some(
        (ch) =>
          hasClassName(ch, 'is-internal') || (ch.getAttribute && ch.getAttribute('data-internal') === 'true')
      );
    }
    return false;
  }

  function readChannel(containerEl, isInternal) {
    const typeField = findNamedField(containerEl, 'type');
    let channel = typeField ? String(fieldValue(typeField)).trim().toLowerCase() : '';
    if (!channel && containerEl) {
      const active = findDescendant(
        containerEl,
        (el) =>
          el.getAttribute &&
          el.getAttribute('data-type') &&
          (hasClassName(el, 'active') ||
            hasClassName(el, 'is-active') ||
            el.getAttribute('aria-selected') === 'true')
      );
      channel = active ? String(active.getAttribute('data-type')).trim().toLowerCase() : '';
    }
    return channel || (isInternal ? 'note' : 'email');
  }

  /**
   * Determines whether a Zammad editor currently holds an internal note
   * (`isInternal: true`) or a public customer message (`isInternal: false`).
   * When in doubt the safe default `isInternal: false` applies, so markers are
   * never sent to customers unnoticed.
   * @returns {{ isInternal: boolean, channel: string, containerEl: Element | null }}
   */
  function detectEditorContext(editorEl) {
    if (!editorEl) return { isInternal: false, channel: 'email', containerEl: null };
    const containerEl = findArticleContainer(editorEl);
    const internalField = findNamedField(containerEl, 'internal');
    const isInternal = internalField
      ? readInternalField(internalField)
      : readInternalMarkers(editorEl, containerEl);
    return { isInternal, channel: readChannel(containerEl, isInternal), containerEl };
  }

  function syncContextClasses(editorEl, ctx) {
    const wrapper = editorEl && (editorEl.parentElement || editorEl.parentNode);
    if (!wrapper || !wrapper.classList) return;
    const internal = Boolean(ctx && ctx.isInternal);
    wrapper.classList.toggle('zb-context-internal', internal);
    wrapper.classList.toggle('zb-context-public', !internal);
  }

  /**
   * Watches the article container for visibility and channel changes without
   * observing the editor itself, so typing stays fast.
   * @param {(ctx: object) => void} onChange
   * @returns {() => void} cleanup
   */
  function watchEditorContext(editorEl, onChange) {
    let lastCtx = detectEditorContext(editorEl);
    syncContextClasses(editorEl, lastCtx);
    const containerEl = lastCtx.containerEl;
    if (!containerEl) return function noop() {};

    let queued = false;
    function checkNow() {
      queued = false;
      const next = detectEditorContext(editorEl);
      syncContextClasses(editorEl, next);
      if (next.isInternal !== lastCtx.isInternal || next.channel !== lastCtx.channel) {
        lastCtx = next;
        if (typeof onChange === 'function') onChange(next);
      }
    }
    function scheduleCheck() {
      if (queued) return;
      queued = true;
      if (typeof root.requestAnimationFrame === 'function') root.requestAnimationFrame(checkNow);
      else setTimeout(checkNow, 25);
    }

    // Changes inside the editor or inside our own UI never change the context.
    function isIgnored(target) {
      if (!target || target.nodeType !== 1) return false;
      return (
        target === editorEl ||
        editorEl.contains(target) ||
        Boolean(target.closest && target.closest('[data-zb-ui]'))
      );
    }

    let observer = null;
    if (typeof MutationObserver === 'function' && containerEl.nodeType === 1) {
      observer = new MutationObserver((mutations) => {
        if (mutations.some((m) => !isIgnored(m.target))) scheduleCheck();
      });
      observer.observe(containerEl, {
        attributes: true,
        attributeFilter: WATCHED_ATTRIBUTES,
        childList: true,
        subtree: true,
      });
    }

    function onInteraction(ev) {
      if (!ev || !isIgnored(ev.target)) scheduleCheck();
    }
    containerEl.addEventListener('click', onInteraction);
    containerEl.addEventListener('change', onInteraction);

    return function cleanup() {
      if (observer) observer.disconnect();
      containerEl.removeEventListener('click', onInteraction);
      containerEl.removeEventListener('change', onInteraction);
      const wrapper = editorEl.parentElement || editorEl.parentNode;
      if (wrapper && wrapper.classList) wrapper.classList.remove('zb-context-internal', 'zb-context-public');
    };
  }

  const api = { detectEditorContext, watchEditorContext };

  ns.editorContext = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
