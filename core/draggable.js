/**
 * Buddy for Zammad – Move windows by their title bar.
 *
 * Used by the search flyout and the toolbar popovers. Pointer events with
 * pointer capture make dragging work with mouse, pen and touch; clicks on
 * buttons or form fields inside the title bar are never treated as a drag.
 * Double-clicking the title bar resets the position.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const isNode = typeof module !== 'undefined' && module.exports;

  const INTERACTIVE = 'button, input, select, textarea, a, summary';
  /** Part of a moved window that always stays inside the viewport. */
  const KEEP_VISIBLE = 48;

  /**
   * Keeps a box of `width` × `height` reachable: at least KEEP_VISIBLE pixels of it
   * (and its title bar) stay inside the viewport.
   * @returns {{ x: number, y: number }}
   */
  function clampToViewport(x, y, width, height, viewportWidth, viewportHeight) {
    const minX = KEEP_VISIBLE - width;
    const maxX = viewportWidth - KEEP_VISIBLE;
    const maxY = viewportHeight - KEEP_VISIBLE;
    return {
      x: Math.round(Math.min(maxX, Math.max(minX, x))),
      y: Math.round(Math.min(maxY, Math.max(0, y))),
    };
  }

  /**
   * @param {HTMLElement} handle title bar
   * @param {{
   *   start: () => { x: number, y: number },   current position when the drag starts
   *   move: (pos: { x: number, y: number }) => { x: number, y: number },  apply, return the applied position
   *   end: (pos: { x: number, y: number }) => void,
   *   reset: () => void,
   * }} options
   * @returns {() => void} detach
   */
  function makeDraggable(handle, options) {
    const target = handle.ownerDocument.documentElement;

    function onPointerDown(ev) {
      if (ev.button !== 0 || (ev.target.closest && ev.target.closest(INTERACTIVE))) return;
      ev.preventDefault();
      const origin = options.start();
      const startX = ev.clientX;
      const startY = ev.clientY;
      let last = origin;
      let moved = false;

      handle.setPointerCapture(ev.pointerId);
      target.classList.add('zb-is-dragging');

      function onMove(e) {
        moved = true;
        last = options.move({ x: origin.x + e.clientX - startX, y: origin.y + e.clientY - startY });
      }
      function onUp() {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        target.classList.remove('zb-is-dragging');
        if (handle.hasPointerCapture(ev.pointerId)) handle.releasePointerCapture(ev.pointerId);
        if (moved) options.end(last);
      }
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    }

    function onDoubleClick(ev) {
      if (ev.target.closest && ev.target.closest(INTERACTIVE)) return;
      options.reset();
    }

    handle.classList.add('zb-drag-handle');
    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('dblclick', onDoubleClick);
    return function detach() {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('dblclick', onDoubleClick);
    };
  }

  const api = { makeDraggable, clampToViewport };

  ns.draggable = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
