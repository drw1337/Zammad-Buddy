/**
 * Buddy for Zammad – Formatting toolbar feature.
 *
 * Mounts a collapsible toolbar above every Zammad reply editor and wires it to
 * the editor commands, the popovers (`./ui/popovers/`) and the email preview
 * (`./ui/preview.js`).
 *
 * - Shows whether the draft is a public reply or an internal note; highlight
 *   markers are only available in internal notes.
 * - Captures `Tab` / `Shift+Tab` before Zammad moves the focus (tables, lists),
 *   `Ctrl+K` (link) and `Ctrl+Shift+C` (inline code).
 * - `Esc` closes the open popover, then the preview.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const ui = ns.wysiwygUi || {};
  const ICONS = ui.icons || {};

  /**
   * Toolbar layout. `run(api)` executes a command, `popover` opens a popover,
   * `state` names the `queryToolbarState()` flag that marks the button active.
   */
  const TOOL_GROUPS = [
    [
      { id: 'bold', icon: 'bold', title: 'cmdBold', state: 'bold', run: (a) => a.inline('bold') },
      { id: 'italic', icon: 'italic', title: 'cmdItalic', state: 'italic', run: (a) => a.inline('italic') },
      {
        id: 'underline',
        icon: 'underline',
        title: 'cmdUnderline',
        state: 'underline',
        run: (a) => a.inline('underline'),
      },
      {
        id: 'strike',
        icon: 'strike',
        title: 'cmdStrike',
        state: 'strike',
        run: (a) => a.inline('strikeThrough'),
      },
    ],
    [
      { id: 'ul', icon: 'ul', title: 'cmdUl', state: 'ul', run: (a) => a.inline('insertUnorderedList') },
      { id: 'ol', icon: 'ol', title: 'cmdOl', state: 'ol', run: (a) => a.inline('insertOrderedList') },
      { id: 'indent', icon: 'indent', title: 'cmdIndent', run: (a) => a.cmd.indentListOrBlock(a.editorEl) },
      {
        id: 'outdent',
        icon: 'outdent',
        title: 'cmdOutdent',
        run: (a) => a.cmd.outdentListOrBlock(a.editorEl),
      },
      {
        id: 'quote',
        icon: 'quote',
        title: 'cmdQuote',
        state: 'quote',
        run: (a) => a.cmd.toggleBlockquote(a.editorEl),
      },
      { id: 'hr', icon: 'hr', title: 'cmdHr', run: (a) => a.cmd.insertHorizontalRule(a.editorEl) },
    ],
    [
      {
        id: 'code',
        icon: 'code',
        title: 'cmdCode',
        state: 'code',
        run: (a) => a.cmd.toggleInlineCode(a.editorEl),
      },
      { id: 'codeBlock', icon: 'codeBlock', title: 'cmdCodeBlock', state: 'codeBlock', popover: 'code' },
      { id: 'link', icon: 'link', title: 'cmdLink', state: 'link', popover: 'link' },
      { id: 'table', icon: 'table', title: 'cmdTable', popover: 'table' },
      { id: 'emoji', icon: 'emoji', title: 'cmdEmoji', popover: 'emoji' },
    ],
    [
      { id: 'highlight', icon: 'highlight', title: 'cmdHighlight', popover: 'highlight', internalOnly: true },
      {
        id: 'clearFormat',
        icon: 'clearFormat',
        title: 'cmdClearFormat',
        run: (a) => a.cmd.clearSelectionFormatting(a.editorEl),
      },
    ],
  ];

  const activeInstances = new Set();

  /** Distance between toolbar and popover, plus a small safety margin. */
  const POPOVER_GAP = 12;

  /**
   * Top edge (viewport coordinates) of the area in which `el` is actually
   * visible: the lowest top edge of all ancestors that clip their content.
   */
  function visibleTopBoundary(el) {
    const win = el.ownerDocument.defaultView || root;
    let boundary = 0;
    for (let cur = el.parentElement; cur && cur !== el.ownerDocument.body; cur = cur.parentElement) {
      const style = win.getComputedStyle(cur);
      if (/(auto|scroll|hidden|clip)/.test(`${style.overflowY}${style.overflow}`)) {
        boundary = Math.max(boundary, cur.getBoundingClientRect().top);
      }
    }
    return boundary;
  }

  function syncRootWysiwygClass(settings) {
    if (!root.document || !root.document.documentElement) return;
    const active = Boolean(!settings || settings.wysiwygEnabled !== false);
    root.document.documentElement.classList.toggle('zb-wysiwyg-ready', active);
  }

  function show(el, visible) {
    el.style.display = visible ? '' : 'none';
  }

  /** Toolbar buttons keep the editor selection: mousedown never takes focus. */
  function createToolButton(doc, iconHtml, onClick) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'zb-tb-btn';
    ns.safeHtml.setHtml(btn, iconHtml);
    btn.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    });
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (btn.disabled || btn.classList.contains('is-disabled')) return;
      onClick(ev);
    });
    return btn;
  }

  function createSeparator(doc) {
    const sep = doc.createElement('span');
    sep.className = 'zb-tb-sep';
    sep.setAttribute('aria-hidden', 'true');
    return sep;
  }

  function saveSettings(patch) {
    return ns.storage ? ns.storage.saveSettings(patch) : Promise.resolve();
  }

  /**
   * Mounts the toolbar for one editor. Called by the DOM observer for every
   * reply editor; returns the cleanup function.
   */
  function attachEditor(editorEl, getSettings) {
    const commands = ns.wysiwygCommands;
    const parent = editorEl.parentElement;
    if (!commands || !parent) return null;
    const doc = editorEl.ownerDocument || root.document;

    const state = { lastCodeLang: 'bash', tableWithHeader: true };
    let activePopover = null;
    let savedPopoverRange = null;
    let isPreviewOpen = false;
    let refreshQueued = false;

    const currentSettings = () => getSettings() || {};
    const t = (key, params) => (ns.i18n ? ns.i18n.t(currentSettings().language || 'en', key, params) : key);
    const isInternal = () =>
      ns.observer && typeof ns.observer.detectEditorContext === 'function'
        ? ns.observer.detectEditorContext(editorEl).isInternal
        : false;

    // ---- DOM ---------------------------------------------------------------

    const shell = doc.createElement('div');
    shell.className = 'zb-wysiwyg-shell';
    shell.setAttribute('data-zb-ui', 'wysiwyg-shell');
    shell.setAttribute('role', 'toolbar');
    shell.addEventListener('click', (ev) => ev.stopPropagation());

    const collapsedStrip = doc.createElement('div');
    collapsedStrip.className = 'zb-wysiwyg-collapsed-strip';
    show(collapsedStrip, false);
    const showBarBtn = doc.createElement('button');
    showBarBtn.type = 'button';
    showBarBtn.className = 'zb-btn zb-btn--wysiwyg-toggle';
    showBarBtn.addEventListener('mousedown', (ev) => ev.preventDefault());
    showBarBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      saveSettings({ wysiwygCollapsed: false });
    });
    collapsedStrip.appendChild(showBarBtn);

    const bar = doc.createElement('div');
    bar.className = 'zb-wysiwyg-bar';
    const leftTools = doc.createElement('div');
    leftTools.className = 'zb-wysiwyg-tools';

    const ctxBadge = doc.createElement('span');
    const ctxIcon = doc.createElement('span');
    ctxIcon.className = 'zb-ctx-icon';
    const ctxLabel = doc.createElement('span');
    ctxLabel.className = 'zb-ctx-label';
    ctxBadge.appendChild(ctxIcon);
    ctxBadge.appendChild(ctxLabel);
    leftTools.appendChild(ctxBadge);

    const commandApi = {
      cmd: commands,
      editorEl,
      inline: (command) => commands.execInlineCommand(editorEl, command),
    };

    /** @type {Map<string, { def: object, btn: HTMLButtonElement }>} */
    const tools = new Map();
    for (const group of TOOL_GROUPS) {
      leftTools.appendChild(createSeparator(doc));
      for (const def of group) {
        const btn = createToolButton(doc, ICONS[def.icon], () => {
          if (def.popover) {
            if (def.internalOnly && !isInternal()) return;
            if (activePopover === def.popover) closePopover(true);
            else openPopover(def.popover);
            return;
          }
          closePopover(false);
          def.run(commandApi);
          scheduleStateRefresh();
        });
        tools.set(def.id, { def, btn });
        leftTools.appendChild(btn);
      }
    }

    const btnHighlight = tools.get('highlight').btn;
    btnHighlight.classList.add('zb-tb-btn--highlight');
    const hlColorBar = doc.createElement('span');
    hlColorBar.className = 'zb-hl-indicator';
    btnHighlight.appendChild(hlColorBar);

    const rightTools = doc.createElement('div');
    rightTools.className = 'zb-wysiwyg-right';

    const btnPreview = doc.createElement('button');
    btnPreview.type = 'button';
    btnPreview.className = 'zb-preview-btn';
    const previewIcon = doc.createElement('span');
    previewIcon.className = 'zb-preview-icon';
    ns.safeHtml.setHtml(previewIcon, ICONS.preview);
    const previewLabel = doc.createElement('span');
    btnPreview.appendChild(previewIcon);
    btnPreview.appendChild(previewLabel);
    btnPreview.addEventListener('mousedown', (ev) => ev.preventDefault());
    btnPreview.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      setPreviewOpen(!isPreviewOpen);
    });

    const hideBarBtn = doc.createElement('button');
    hideBarBtn.type = 'button';
    hideBarBtn.className = 'zb-tb-btn zb-tb-btn--collapse-only';
    hideBarBtn.textContent = '▴';
    show(hideBarBtn, false);
    hideBarBtn.addEventListener('mousedown', (ev) => ev.preventDefault());
    hideBarBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      saveSettings({ wysiwygCollapsed: true });
    });

    rightTools.appendChild(btnPreview);
    rightTools.appendChild(hideBarBtn);
    bar.appendChild(leftTools);
    bar.appendChild(rightTools);

    const popoverHost = doc.createElement('div');
    popoverHost.className = 'zb-popover';
    popoverHost.hidden = true;

    shell.appendChild(collapsedStrip);
    shell.appendChild(bar);
    shell.appendChild(popoverHost);

    const preview = ui.createPreviewPane({
      doc,
      editorEl,
      commands,
      t,
      isInternal,
      onCloseRequest: () => setPreviewOpen(false),
    });

    parent.insertBefore(shell, editorEl);
    parent.insertBefore(preview.element, editorEl.nextSibling);

    // ---- Popovers ----------------------------------------------------------

    function clearPopoverMarkers() {
      for (const { btn } of tools.values()) btn.classList.remove('is-popover-open');
    }

    function closePopover(restoreEditorFocus) {
      if (!activePopover) return;
      activePopover = null;
      popoverHost.hidden = true;
      popoverHost.textContent = '';
      popoverHost.className = 'zb-popover';
      popoverHost.style.transform = '';
      clearPopoverMarkers();
      if (restoreEditorFocus && !isPreviewOpen) {
        commands.restoreSelectionRange(editorEl, savedPopoverRange);
      }
      savedPopoverRange = null;
      scheduleStateRefresh();
    }

    function openPopover(name) {
      const popover = ui.popovers && ui.popovers[name];
      if (isPreviewOpen || !popover) return;
      if (activePopover) closePopover(false);

      savedPopoverRange = commands.saveSelectionRange(editorEl);
      activePopover = name;
      clearPopoverMarkers();
      for (const { def, btn } of tools.values()) {
        if (def.popover === name) btn.classList.add('is-popover-open');
      }

      popoverHost.textContent = '';
      popoverHost.className = `zb-popover zb-popover--${name}`;
      popoverHost.hidden = false;

      popover.render({
        doc,
        editorEl,
        host: popoverHost,
        commands,
        settings: currentSettings(),
        t,
        state,
        savedRange: savedPopoverRange,
        close: closePopover,
        refresh: scheduleStateRefresh,
        resetPosition: resetPopoverOffset,
      });
      placePopover();
      popoverOffset = savedPopoverOffset();
      applyPopoverOffset(popoverOffset);

      const head = popoverHost.querySelector('.zb-pop-head');
      if (head && ns.draggable) {
        ns.draggable.makeDraggable(head, {
          start: () => popoverOffset || { x: 0, y: 0 },
          move: applyPopoverOffset,
          end(offset) {
            popoverOffset = offset;
            if (ns.storage) ns.storage.saveUiPosition('popover', offset);
          },
          reset: resetPopoverOffset,
        });
      }
    }

    // ---- Popover position (dragged offset, shared by all toolbar popovers) --

    let popoverOffset = null;

    function savedPopoverOffset() {
      return (currentSettings().uiPositions || {}).popover || null;
    }

    /**
     * Shifts the popover by `offset` from its default place, kept inside the
     * viewport. Returns the offset that was actually applied.
     */
    function applyPopoverOffset(offset) {
      popoverHost.style.transform = '';
      const resetBtn = popoverHost.querySelector('.zb-pop-reset');
      if (!offset) {
        if (resetBtn) resetBtn.hidden = true;
        return { x: 0, y: 0 };
      }
      const base = popoverHost.getBoundingClientRect();
      const win = doc.defaultView || root;
      const target = ns.draggable.clampToViewport(
        base.left + offset.x,
        base.top + offset.y,
        base.width,
        base.height,
        win.innerWidth,
        win.innerHeight
      );
      const applied = { x: Math.round(target.x - base.left), y: Math.round(target.y - base.top) };
      popoverHost.style.transform = `translate(${applied.x}px, ${applied.y}px)`;
      if (resetBtn) resetBtn.hidden = applied.x === 0 && applied.y === 0;
      return applied;
    }

    function resetPopoverOffset() {
      popoverOffset = null;
      applyPopoverOffset(null);
      if (ns.storage) ns.storage.saveUiPosition('popover', null);
    }

    /**
     * Opens the popover upwards (over the conversation history) when there is
     * room, so the text being edited stays visible. Falls back to opening
     * downwards. "Room" is measured against the closest clipping ancestor,
     * i.e. Zammad's scrollable ticket area, not just the window.
     */
    function placePopover() {
      popoverHost.classList.remove('is-above');
      const shellTop = shell.getBoundingClientRect().top;
      const spaceAbove = shellTop - visibleTopBoundary(shell);
      if (spaceAbove >= popoverHost.offsetHeight + POPOVER_GAP) {
        popoverHost.classList.add('is-above');
      }
    }

    // ---- Preview -----------------------------------------------------------

    function setPreviewOpen(nextOpen) {
      const open = Boolean(nextOpen);
      if (open === isPreviewOpen) return;
      if (open) closePopover(false);
      isPreviewOpen = open;

      preview.setOpen(open);
      leftTools.classList.toggle('is-preview-locked', open);
      for (const { def, btn } of tools.values()) {
        if (def.id !== 'highlight') btn.disabled = open;
      }

      renderToolbarChrome();
      if (!open) {
        editorEl.focus();
        scheduleStateRefresh();
      }
    }

    // ---- State -------------------------------------------------------------

    function refreshActiveStates() {
      const st = commands.queryToolbarState(editorEl);
      for (const { def, btn } of tools.values()) {
        if (def.state) btn.classList.toggle('is-active', Boolean(st[def.state]));
      }
      btnHighlight.classList.toggle('is-active', Boolean(st.highlightColor));
      hlColorBar.style.backgroundColor = st.highlightColor || '#fef08a';
    }

    function scheduleStateRefresh() {
      if (refreshQueued) return;
      refreshQueued = true;
      const run = () => {
        refreshQueued = false;
        refreshActiveStates();
      };
      if (typeof root.requestAnimationFrame === 'function') root.requestAnimationFrame(run);
      else setTimeout(run, 30);
    }

    function renderContextBadge() {
      const internal = isInternal();
      ctxBadge.className = `zb-ctx-badge ${internal ? 'is-internal' : 'is-public'}`;
      ns.safeHtml.setHtml(ctxIcon, internal ? ICONS.lock : ICONS.mail);
      ctxLabel.textContent = t(internal ? 'ctxInternalNote' : 'ctxPublicReply');
      ctxBadge.title = t(internal ? 'ctxInternalNoteHint' : 'ctxPublicReplyHint');

      if (internal) {
        btnHighlight.classList.remove('is-disabled');
        btnHighlight.disabled = isPreviewOpen;
        btnHighlight.title = t('cmdHighlight');
      } else {
        if (activePopover === 'highlight') closePopover(false);
        // Stays focusable so the tooltip can explain why it is unavailable.
        btnHighlight.classList.add('is-disabled');
        btnHighlight.disabled = false;
        btnHighlight.title = t('cmdHighlightDisabled');
      }
    }

    /** Applies settings (enabled / collapsed / language) and context to the chrome. */
    function renderToolbarChrome() {
      const settings = currentSettings();

      if (settings.wysiwygEnabled === false) {
        if (isPreviewOpen) setPreviewOpen(false);
        closePopover(false);
        show(shell, false);
        return;
      }
      show(shell, true);

      const formatGuardVisible = settings.enabled !== false;
      if (settings.wysiwygCollapsed) {
        if (isPreviewOpen) setPreviewOpen(false);
        closePopover(false);
        show(bar, false);
        // Without the Format Guard bar there is no other toggle; show a small strip.
        show(collapsedStrip, !formatGuardVisible);
        showBarBtn.textContent = `${t('wysiwygShowBarBtn')} ▸`;
        showBarBtn.title = t('barToggleWysiwygShowTitle');
        return;
      }

      show(collapsedStrip, false);
      show(bar, true);
      show(hideBarBtn, !formatGuardVisible);
      hideBarBtn.title = t('wysiwygHideBarTitle');

      renderContextBadge();
      for (const { def, btn } of tools.values()) {
        if (def.id !== 'highlight') btn.title = t(def.title);
      }

      previewLabel.textContent = t('cmdPreview');
      btnPreview.classList.toggle('is-active', isPreviewOpen);
      btnPreview.setAttribute('aria-pressed', String(isPreviewOpen));
      btnPreview.title = t(isPreviewOpen ? 'cmdPreviewActiveTitle' : 'cmdPreviewTitle');

      preview.render();
      scheduleStateRefresh();
    }

    // ---- Keyboard & document events ----------------------------------------

    function onEditorKeydownCapture(ev) {
      const settings = currentSettings();
      if (settings.wysiwygEnabled === false) return;
      const mod = ev.ctrlKey || ev.metaKey;
      const key = String(ev.key).toLowerCase();

      if (mod && !ev.altKey && !ev.shiftKey && key === 'k') {
        ev.preventDefault();
        ev.stopPropagation();
        if (settings.wysiwygCollapsed)
          saveSettings({ wysiwygCollapsed: false }).then(() => openPopover('link'));
        else openPopover('link');
        return;
      }

      if (mod && ev.shiftKey && !ev.altKey && key === 'c') {
        ev.preventDefault();
        ev.stopPropagation();
        commands.toggleInlineCode(editorEl);
        scheduleStateRefresh();
        return;
      }

      // Capture phase: handle Tab before Zammad moves the focus.
      if (ev.key === 'Tab' && !mod && !ev.altKey) {
        if (doc.querySelector(ns.zammadDom.SELECTORS.autocompleteOpen)) return;
        if (commands.handleTabNavigation(editorEl, ev.shiftKey)) {
          ev.preventDefault();
          ev.stopPropagation();
          scheduleStateRefresh();
        }
      }
    }

    function onDocPointerDown(ev) {
      if (activePopover && !shell.contains(ev.target)) closePopover(false);
    }

    function onDocKeydown(ev) {
      if (ev.key !== 'Escape') return;
      if (activePopover) {
        ev.preventDefault();
        closePopover(true);
      } else if (isPreviewOpen) {
        ev.preventDefault();
        setPreviewOpen(false);
      }
    }

    function onDocSelectionChange() {
      if (isPreviewOpen) return;
      const active = doc.activeElement;
      if (active === editorEl || (active && editorEl.contains(active))) scheduleStateRefresh();
    }

    editorEl.addEventListener('keydown', onEditorKeydownCapture, true);
    editorEl.addEventListener('keyup', scheduleStateRefresh);
    editorEl.addEventListener('mouseup', scheduleStateRefresh);
    doc.addEventListener('mousedown', onDocPointerDown);
    doc.addEventListener('keydown', onDocKeydown);
    doc.addEventListener('selectionchange', onDocSelectionChange);

    const stopContextWatch =
      ns.observer && typeof ns.observer.watchEditorContext === 'function'
        ? ns.observer.watchEditorContext(editorEl, renderToolbarChrome)
        : null;

    const instance = { refresh: renderToolbarChrome };
    activeInstances.add(instance);
    renderToolbarChrome();

    return function detach() {
      isPreviewOpen = false;
      preview.destroy();
      if (typeof stopContextWatch === 'function') stopContextWatch();
      editorEl.removeEventListener('keydown', onEditorKeydownCapture, true);
      editorEl.removeEventListener('keyup', scheduleStateRefresh);
      editorEl.removeEventListener('mouseup', scheduleStateRefresh);
      doc.removeEventListener('mousedown', onDocPointerDown);
      doc.removeEventListener('keydown', onDocKeydown);
      doc.removeEventListener('selectionchange', onDocSelectionChange);
      activeInstances.delete(instance);
      if (shell.parentNode) shell.parentNode.removeChild(shell);
    };
  }

  const feature = {
    id: 'wysiwyg',
    onStart(settings) {
      syncRootWysiwygClass(settings);
    },
    onSettingsChanged(settings) {
      syncRootWysiwygClass(settings);
      for (const inst of activeInstances) inst.refresh();
    },
    attachEditor,
  };

  if (ns.observer) ns.observer.registerFeature(feature);
  ns.wysiwyg = feature;
})(typeof globalThis !== 'undefined' ? globalThis : window);
