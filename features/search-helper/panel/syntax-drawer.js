/**
 * Buddy for Zammad – Query syntax drawer of the advanced search panel.
 *
 * Shows the compiled Zammad query, lets agents edit it by hand, copy it and
 * save it as a preset. Collapsed by default.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.searchPanelParts = ns.searchPanelParts || {});

  const COPY_FEEDBACK_MS = 1500;

  /**
   * @param {ReturnType<typeof parts.createKit>} kit
   * @param {{ t: (key: string) => string, onManualEdit: () => void, onPresetSaved: () => void }} options
   */
  function createSyntaxDrawer(kit, options) {
    let open = false;
    let copyTimer = null;

    const drawer = kit.el('div', { className: 'zb-syntax-drawer' });
    drawer.hidden = true;

    const btnSave = kit.button('zb-text-link', 'searchSaveFavBtn');
    const btnCopy = kit.button('zb-text-link', 'searchCopyBtn');
    const queryInput = kit.textInput('searchQueryPlaceholder', 'zb-query-field');
    queryInput.spellcheck = false;
    queryInput.setAttribute('data-i18n-aria-label', 'searchQueryPreviewLabel');

    const saveRow = kit.el('div', { className: 'zb-save-row' });
    saveRow.hidden = true;
    const nameInput = kit.textInput('searchFavNamePlaceholder');
    const btnConfirm = kit.button('zb-btn-sec', 'searchFavConfirmBtn');
    saveRow.appendChild(nameInput);
    saveRow.appendChild(btnConfirm);

    drawer.appendChild(
      kit.row('zb-syntax-head', [
        kit.el('span', { className: 'zb-label', i18n: 'searchQueryPreviewLabel' }),
        kit.row('zb-syntax-actions', [btnSave, btnCopy]),
      ])
    );
    drawer.appendChild(queryInput);
    drawer.appendChild(saveRow);

    queryInput.addEventListener('input', options.onManualEdit);

    btnCopy.addEventListener('click', async () => {
      const query = queryInput.value.trim();
      if (!query) return;
      try {
        if (root.navigator && root.navigator.clipboard) await root.navigator.clipboard.writeText(query);
        btnCopy.textContent = options.t('searchCopiedBtn');
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => {
          btnCopy.textContent = options.t('searchCopyBtn');
        }, COPY_FEEDBACK_MS);
      } catch (_) {
        // Clipboard access can be denied; the query stays selectable in the field.
      }
    });

    function setSaveRowOpen(next) {
      saveRow.hidden = !next;
      if (next) nameInput.focus();
    }

    btnSave.addEventListener('click', () => {
      if (queryInput.value.trim()) setSaveRowOpen(saveRow.hidden);
    });

    async function confirmSave() {
      const label = nameInput.value.trim();
      const query = queryInput.value.trim();
      if (!label || !query) return;
      await parts.savePreset(label, query);
      nameInput.value = '';
      setSaveRowOpen(false);
      options.onPresetSaved();
    }

    btnConfirm.addEventListener('click', confirmSave);
    nameInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
        confirmSave();
      }
    });

    return {
      element: drawer,
      nameInput,
      getQuery: () => queryInput.value.trim(),
      setQuery(query) {
        queryInput.value = query;
      },
      isOpen: () => open,
      setOpen(next) {
        open = Boolean(next);
        drawer.hidden = !open;
      },
      destroy: () => clearTimeout(copyTimer),
    };
  }

  parts.createSyntaxDrawer = createSyntaxDrawer;
})(typeof globalThis !== 'undefined' ? globalThis : window);
