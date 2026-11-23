/**
 * Buddy for Zammad – In-Page Advanced Ticket Search Integration.
 *
 * Key stability & focus protections for Zammad 6.x / 7.x:
 * 1. Renders inside Light DOM (`#zbSearchFlyout`) instead of Shadow DOM so
 *    `document.activeElement` and `event.target` are real `<input>` elements
 *    (preventing Zammad's global type-to-search shortcut handler from hijacking
 *    keystrokes like `s` into `#global-search`).
 * 2. Places the trigger button OUTSIDE Zammad's `<label>` / `.search` wrapper so
 *    clicking it never activates Zammad's QuickSearch focus watcher.
 * 3. Shields `focusin` in the capture phase while open so open Zammad drawers
 *    (e.g. Notifications focus-trap) cannot pull focus away from our inputs.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ZammadBuddy = (root.ZammadBuddy = root.ZammadBuddy || {});
  const searchPanel = ZammadBuddy.searchPanel;
  const searchQuery = ZammadBuddy.searchQuery;
  const i18n = ZammadBuddy.i18n;

  const zammadDom = ZammadBuddy.zammadDom;

  const SLIDERS_ICON_SVG =
    '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/></svg>';

  let currentSettings = null;
  let navObserver = null;
  let triggerBtn = null;
  let triggerLabelSpan = null;
  let popoverEl = null;
  let panelController = null;
  let isOpen = false;

  function tr(key, params) {
    const lang = (currentSettings && currentSettings.language) || 'en';
    return i18n ? i18n.t(lang, key, params) : key;
  }

  function findZammadSidebarSearchInput() {
    if (!root.document) return null;
    return root.document.querySelector(zammadDom.SELECTORS.sidebarSearch);
  }

  function runZammadSearchInCurrentPage(rawQuery) {
    const clean = String(rawQuery || '').trim();
    if (!clean || !root.location) return false;

    const sidebarInput = findZammadSidebarSearchInput();
    if (sidebarInput) {
      sidebarInput.value = clean;
      sidebarInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const detailSearchInput =
      root.document && root.document.querySelector(zammadDom.SELECTORS.searchPageInput);
    if (detailSearchInput) {
      detailSearchInput.value = clean;
      detailSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
      detailSearchInput.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true })
      );
    }

    const targetHash = searchQuery
      ? searchQuery.buildZammadSearchHash(clean)
      : `#search/${encodeURIComponent(clean)}`;

    if (root.location.hash === targetHash) {
      root.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      root.location.hash = targetHash;
    }
    return true;
  }

  function closePopover() {
    if (!isOpen) return;
    isOpen = false;
    if (popoverEl) popoverEl.style.display = 'none';
    if (triggerBtn) triggerBtn.classList.remove('is-active');
  }

  /** Custom position of the flyout, or null for "anchored below the trigger". */
  let customPosition = null;

  function savedFlyoutPosition() {
    const positions = (currentSettings && currentSettings.uiPositions) || {};
    return positions.searchFlyout || null;
  }

  /** Moves the flyout to `pos`, keeping its title bar reachable; returns the applied position. */
  function applyPosition(pos) {
    const box = popoverEl.getBoundingClientRect();
    const next = ZammadBuddy.draggable.clampToViewport(
      pos.x,
      pos.y,
      box.width,
      box.height,
      root.innerWidth,
      root.innerHeight
    );
    popoverEl.style.left = `${next.x}px`;
    popoverEl.style.top = `${next.y}px`;
    return next;
  }

  /** Default placement: below the trigger, shifted into the viewport. */
  function anchorBelowTrigger() {
    const rect = triggerBtn.getBoundingClientRect();
    const box = popoverEl.getBoundingClientRect();
    const margin = 10;
    const left = Math.max(margin, Math.min(rect.left, root.innerWidth - box.width - margin));
    const top = Math.max(margin, Math.min(rect.bottom + 6, root.innerHeight - box.height - margin));
    popoverEl.style.left = `${Math.round(left)}px`;
    popoverEl.style.top = `${Math.round(top)}px`;
  }

  function positionPopover() {
    if (!triggerBtn || !popoverEl) return;
    if (customPosition) applyPosition(customPosition);
    else anchorBelowTrigger();
    if (panelController) panelController.setMoved(Boolean(customPosition));
  }

  function resetPosition() {
    customPosition = null;
    positionPopover();
    if (ZammadBuddy.storage) ZammadBuddy.storage.saveUiPosition('searchFlyout', null);
  }

  function ensurePopoverMounted() {
    if (popoverEl || !root.document || !root.document.body || !searchPanel) return;
    const doc = root.document;

    popoverEl = doc.createElement('div');
    popoverEl.id = 'zbSearchFlyout';
    popoverEl.setAttribute('data-zb-ui', 'search-popover');
    popoverEl.style.display = 'none';
    doc.body.appendChild(popoverEl);

    panelController = searchPanel.mountSearchBuilder(popoverEl, {
      doc,
      getSettings: () => currentSettings || {},
      onRequestClose: closePopover,
      onResetPosition: resetPosition,
      onExecuteSearch(query) {
        closePopover();
        runZammadSearchInCurrentPage(query);
      },
    });

    // Drag the flyout by its title bar; the position is remembered.
    ZammadBuddy.draggable.makeDraggable(panelController.dragHandle, {
      start: () => ({ x: popoverEl.offsetLeft, y: popoverEl.offsetTop }),
      move: applyPosition,
      end(pos) {
        customPosition = pos;
        panelController.setMoved(true);
        if (ZammadBuddy.storage) ZammadBuddy.storage.saveUiPosition('searchFlyout', pos);
      },
      reset: resetPosition,
    });
    root.addEventListener('resize', () => {
      if (isOpen) positionPopover();
    });
  }

  function togglePopover() {
    ensurePopoverMounted();
    if (!popoverEl) return;

    if (isOpen) {
      closePopover();
      return;
    }

    // Blur Zammad's own search field so its QuickSearch watcher stays idle
    const sidebarInput = findZammadSidebarSearchInput();
    if (sidebarInput && typeof sidebarInput.blur === 'function') {
      sidebarInput.blur();
    }

    isOpen = true;
    popoverEl.classList.toggle('is-dark', zammadDom.isDarkMode(root.document));
    if (triggerBtn) triggerBtn.classList.add('is-active');
    if (panelController) panelController.refresh();
    popoverEl.style.display = 'block';
    customPosition = savedFlyoutPosition();
    positionPopover();

    if (panelController) {
      if (typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(() => panelController.focusFirst());
      } else {
        panelController.focusFirst();
      }
    }
  }

  function unmountSearchButton() {
    closePopover();
    if (triggerBtn && triggerBtn.parentNode) {
      triggerBtn.parentNode.removeChild(triggerBtn);
    }
    triggerBtn = null;
    triggerLabelSpan = null;
  }

  function scanAndMountSearchButton() {
    if (!root.document || !root.document.body) return;

    const enabled = Boolean(
      currentSettings && currentSettings.hostActive !== false && currentSettings.inPageSearchEnabled !== false
    );

    if (!enabled) {
      unmountSearchButton();
      return;
    }

    if (triggerBtn && root.document.contains(triggerBtn)) {
      triggerBtn.title = tr('inPageSearchBtnTitle');
      if (triggerLabelSpan) triggerLabelSpan.textContent = tr('inPageSearchTriggerLabel');
      if (panelController) panelController.refresh();
      return;
    }

    const inputEl = findZammadSidebarSearchInput();
    if (!inputEl || !inputEl.parentElement) return;

    const doc = root.document;
    triggerBtn = doc.createElement('button');
    triggerBtn.type = 'button';
    triggerBtn.className = 'zb-search-trigger-btn';
    triggerBtn.setAttribute('data-zb-ui', 'search-trigger');
    ZammadBuddy.safeHtml.setHtml(triggerBtn, SLIDERS_ICON_SVG);

    triggerLabelSpan = doc.createElement('span');
    triggerLabelSpan.textContent = tr('inPageSearchTriggerLabel');
    triggerBtn.appendChild(triggerLabelSpan);

    triggerBtn.title = tr('inPageSearchBtnTitle');

    // Keep Zammad's surrounding search container from grabbing focus on mousedown / pointerdown
    const blockParentSearchActivation = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    triggerBtn.addEventListener('mousedown', blockParentSearchActivation);
    triggerBtn.addEventListener('pointerdown', blockParentSearchActivation);
    triggerBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      togglePopover();
    });

    // Placed outside `<label>` / `<form>` / `.search` so Zammad's QuickSearch wrapper does not react
    const outerSearchWrap = inputEl.closest(zammadDom.SELECTORS.sidebarSearchWrapper) || inputEl;
    if (outerSearchWrap.parentElement) {
      outerSearchWrap.insertAdjacentElement('afterend', triggerBtn);
    } else {
      inputEl.insertAdjacentElement('afterend', triggerBtn);
    }
  }

  if (root.document) {
    // Capture-phase `focusin` shield: open Zammad flyouts (e.g. notifications)
    // must not pull focus away from our Light-DOM inputs.
    root.document.addEventListener(
      'focusin',
      (ev) => {
        if (isOpen && popoverEl && popoverEl.contains(ev.target)) {
          ev.stopImmediatePropagation();
        }
      },
      true
    );

    root.document.addEventListener('mousedown', (ev) => {
      if (!isOpen) return;
      if (popoverEl && popoverEl.contains(ev.target)) return;
      if (triggerBtn && triggerBtn.contains(ev.target)) return;
      closePopover();
    });

    root.document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && isOpen) {
        ev.preventDefault();
        closePopover();
      }
    });
  }

  const feature = {
    id: 'search-helper',
    onStart(settings) {
      currentSettings = settings;
      scanAndMountSearchButton();

      if (navObserver) navObserver.disconnect();
      if (root.document && root.document.body && typeof MutationObserver === 'function') {
        navObserver = new MutationObserver(() => {
          if (!triggerBtn || !root.document.contains(triggerBtn)) {
            scanAndMountSearchButton();
          }
        });
        navObserver.observe(root.document.body, { childList: true, subtree: true });
      }
    },
    onSettingsChanged(settings) {
      currentSettings = settings;
      scanAndMountSearchButton();
    },
  };

  if (ZammadBuddy.observer) {
    ZammadBuddy.observer.registerFeature(feature);
  }
  ZammadBuddy.searchHelper = Object.assign({}, feature, {
    runZammadSearchInCurrentPage,
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
