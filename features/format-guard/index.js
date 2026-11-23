/**
 * Buddy for Zammad – Format Guard feature.
 *
 * - Cleans pasted HTML in the capture phase (image / file pastes go straight
 *   to Zammad's upload handling).
 * - Watches the editor and the article context (public reply vs. internal
 *   note): highlight markers are fine in internal notes but flagged as soon as
 *   the draft is switched to public.
 * - Shows the status bar with one-click cleanup and the toolbar toggle.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = ns.formatGuardParts || {};
  const { paste } = parts;

  const TOAST_MS = 3400;
  const WATCHED_ATTRIBUTES = ['style', 'color', 'bgcolor', 'face', 'size', 'class'];

  const activeInstances = new Set();

  /** Root classes drive the X-ray outline CSS in format-guard.css. */
  function syncRootClasses(settings) {
    const html = root.document && root.document.documentElement;
    if (!html) return;
    const enabled = !settings || settings.enabled !== false;
    html.classList.toggle('zb-enabled', enabled);
    html.classList.toggle('zb-xray', enabled && (!settings || settings.xrayHighlight !== false));
    html.classList.toggle('zb-preserve-quotes', !settings || settings.preserveBlockquotes !== false);
  }

  function saveSettings(patch) {
    if (ns.storage) ns.storage.saveSettings(patch);
  }

  function attachEditor(editorEl, getSettings) {
    const parent = editorEl.parentElement;
    if (!parent || !ns.sanitizer) return null;
    const doc = editorEl.ownerDocument || root.document;

    let toast = null; // { key, params }
    let toastTimer = null;
    let skipNextPaste = false;
    let renderQueued = false;

    const settings = () => getSettings() || {};
    const lang = () => settings().language || 'en';
    const t = (key, params) => (ns.i18n ? ns.i18n.t(lang(), key, params) : key);
    const categories = (keys) => (ns.i18n ? ns.i18n.translateCategories(lang(), keys) : keys.join(', '));

    /** Sanitizer options: settings plus the editor's current context. */
    function sanitizerOptions() {
      const ctx = ns.observer ? ns.observer.detectEditorContext(editorEl) : { isInternal: false };
      return Object.assign({}, settings(), { isInternal: Boolean(ctx && ctx.isInternal) });
    }

    const statusBar = parts.createStatusBar(doc, {
      onClean() {
        const { cleanedCount } = ns.sanitizer.cleanEditorDom(editorEl, sanitizerOptions());
        paste.notifyEditorChanged(editorEl);
        editorEl.focus();
        if (cleanedCount > 0 && ns.storage) ns.storage.incrementCleanedStat(1);
        showToast(cleanedCount === 1 ? 'toastCleanedOne' : 'toastCleanedMany', { count: cleanedCount });
      },
      onTogglePasteCleanup() {
        // Off in the settings: switch it on. On: skip cleanup for the next paste only.
        if (settings().autoCleanPaste === false) {
          saveSettings({ autoCleanPaste: true });
          return;
        }
        skipNextPaste = !skipNextPaste;
        render();
        editorEl.focus();
      },
      onToggleToolbar() {
        saveSettings({ wysiwygCollapsed: !settings().wysiwygCollapsed });
      },
    });
    parent.insertBefore(statusBar.element, editorEl);

    function render() {
      statusBar.render({
        settings: settings(),
        t,
        categories,
        report: ns.sanitizer.detectHiddenFormatting(editorEl, sanitizerOptions()),
        toast,
        skipNextPaste,
      });
    }

    function scheduleRender() {
      if (renderQueued) return;
      renderQueued = true;
      const run = () => {
        renderQueued = false;
        render();
      };
      if (typeof root.requestAnimationFrame === 'function') root.requestAnimationFrame(run);
      else setTimeout(run, 40);
    }

    function showToast(key, params) {
      toast = { key, params };
      clearTimeout(toastTimer);
      render();
      toastTimer = setTimeout(() => {
        toast = null;
        render();
      }, TOAST_MS);
    }

    function onPasteCapture(ev) {
      const current = settings();
      if (current.enabled === false) return;
      if (skipNextPaste || current.autoCleanPaste === false) {
        skipNextPaste = false;
        scheduleRender();
        return;
      }

      const cb = ev.clipboardData;
      if (!cb || paste.hasOnlyImageOrFilePayload(cb)) return;
      const rawHtml = cb.getData('text/html');
      if (!rawHtml || !rawHtml.trim()) {
        scheduleRender(); // plain text: nothing to clean
        return;
      }

      ev.preventDefault();
      ev.stopImmediatePropagation();
      const cleaned = ns.sanitizer.cleanPastedHtml(rawHtml, cb.getData('text/plain'), sanitizerOptions());
      paste.insertHtmlAtSelection(editorEl, cleaned.html);
      paste.notifyEditorChanged(editorEl);

      if (!cleaned.hadHiddenFormatting) {
        scheduleRender();
        return;
      }
      if (ns.storage) ns.storage.incrementCleanedStat(1);
      if (cleaned.detectedCategories && cleaned.detectedCategories.length > 0) {
        showToast('toastPasteCleaned', { categoryKeys: cleaned.detectedCategories });
      } else {
        showToast('toastPasteCleanedSimple');
      }
    }

    editorEl.addEventListener('paste', onPasteCapture, true);
    editorEl.addEventListener('input', scheduleRender);
    editorEl.addEventListener('keyup', scheduleRender);

    const editorObserver = new MutationObserver(scheduleRender);
    editorObserver.observe(editorEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: WATCHED_ATTRIBUTES,
    });

    const stopContextWatch = ns.observer ? ns.observer.watchEditorContext(editorEl, render) : null;

    const instance = { refresh: render };
    activeInstances.add(instance);
    render();

    return function detach() {
      clearTimeout(toastTimer);
      editorObserver.disconnect();
      if (typeof stopContextWatch === 'function') stopContextWatch();
      editorEl.removeEventListener('paste', onPasteCapture, true);
      editorEl.removeEventListener('input', scheduleRender);
      editorEl.removeEventListener('keyup', scheduleRender);
      activeInstances.delete(instance);
      statusBar.element.remove();
    };
  }

  const feature = {
    id: 'format-guard',
    onStart: syncRootClasses,
    onSettingsChanged(settings) {
      syncRootClasses(settings);
      for (const inst of activeInstances) inst.refresh();
    },
    attachEditor,
  };

  if (ns.observer) ns.observer.registerFeature(feature);
  ns.formatGuard = feature;
})(typeof globalThis !== 'undefined' ? globalThis : window);
