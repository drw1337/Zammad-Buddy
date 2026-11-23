/**
 * Buddy for Zammad – Instances tab of the popup.
 *
 * Connecting an instance requests the host permission for exactly that origin
 * and stores the instance; removing it also gives the permission back. The
 * list render is guarded by a sequence number so overlapping async renders
 * (fast toggling, language switch) never show an instance twice.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const popup = (ns.popup = ns.popup || {});
  const api = popup.browserApi;

  const TRASH_ICON =
    '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3.5 4.5h9M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M5 4.5l.5 8.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1l.5-8.5"/></svg>';

  function sameInstance(inst, parsed) {
    return (
      Boolean(inst && parsed) &&
      (inst.origin === parsed.origin || String(inst.host || '').toLowerCase() === parsed.host.toLowerCase())
    );
  }

  /**
   * @param {Document} doc
   * @param {{
   *   getSettings: () => object, setSettings: (s: object) => void,
   *   getActiveTab: () => { id: number | null, parsed: object | null },
   *   t: (key: string, params?: object) => string,
   *   render: () => Promise<void>, switchTab: (name: string) => void
   * }} app
   */
  function createInstancesTab(doc, app) {
    const $ = (id) => doc.getElementById(id);
    const els = {
      hostChip: $('hostChip'),
      count: $('instanceCount'),
      banner: $('tabBanner'),
      dot: $('tabStatusDot'),
      status: $('tabStatusText'),
      connectBtn: $('btnConnectCurrent'),
      form: $('addInstanceForm'),
      input: $('inputInstanceUrl'),
      feedback: $('formFeedback'),
      list: $('instanceList'),
      empty: $('emptyInstancesHint'),
    };

    let feedback = null; // { key, params }
    let renderSeq = 0;

    const instances = () => ns.storage.dedupeInstances(app.getSettings().instances || []);

    function setFeedback(key, params) {
      feedback = key ? { key, params } : null;
      renderFeedback();
    }

    function renderFeedback() {
      els.feedback.hidden = !feedback;
      els.feedback.textContent = feedback ? app.t(feedback.key, feedback.params) : '';
    }

    async function saveInstances(list) {
      app.setSettings(await ns.storage.saveSettings({ instances: list }));
    }

    /** Requests the permission first (needs the click gesture), then stores the instance. */
    function connect(parsed, candidateTabId) {
      setFeedback(null);
      const permission = api.requestOriginPermission(parsed.matchPattern);

      const previous = Array.isArray(app.getSettings().instances) ? app.getSettings().instances : [];
      const existed = previous.some((inst) => sameInstance(inst, parsed));
      const optimistic = existed
        ? previous.map((inst) =>
            inst.origin === parsed.origin ? Object.assign({}, inst, { enabled: true }) : inst
          )
        : previous.concat([
            {
              origin: parsed.origin,
              host: parsed.host,
              matchPattern: parsed.matchPattern,
              enabled: true,
              addedAt: new Date().toISOString(),
            },
          ]);

      Promise.all([permission, saveInstances(optimistic)])
        .then(async ([granted]) => {
          if (!granted) {
            if (!existed) await saveInstances(previous);
            setFeedback('errPermissionDenied', { host: parsed.host });
            return;
          }
          els.input.value = '';
          const tab = app.getActiveTab();
          const injectInto =
            tab.parsed && tab.parsed.host === parsed.host ? (candidateTabId ?? tab.id) : null;
          api.requestBackgroundSync(injectInto);
        })
        .catch(() => setFeedback('errPermissionDenied', { host: parsed.host }))
        .finally(() => app.render());
    }

    async function remove(inst) {
      const remaining = (app.getSettings().instances || []).filter((i) => i.origin !== inst.origin);
      await saveInstances(remaining);
      if (!remaining.some((i) => i.matchPattern === inst.matchPattern)) {
        await api.removeOriginPermission(inst.matchPattern);
      }
      api.requestBackgroundSync(null);
      await app.render();
    }

    async function setEnabled(inst, enabled) {
      const updated = (app.getSettings().instances || []).map((item) =>
        item.origin === inst.origin ? Object.assign({}, item, { enabled }) : item
      );
      await saveInstances(updated);
      api.requestBackgroundSync(enabled ? app.getActiveTab().id : null);
      await app.render();
    }

    // ---- Current tab banner and header chip ---------------------------------

    function setBanner(state, text) {
      els.banner.classList.toggle('is-muted', state === 'muted');
      els.dot.className = `status-dot${state === 'muted' ? '' : ` is-${state}`}`;
      els.status.textContent = text;
    }

    async function renderBanner() {
      const tab = app.getActiveTab().parsed;
      els.connectBtn.hidden = true;
      els.hostChip.hidden = true;

      if (!tab) {
        setBanner('muted', app.t('currentTabUnsupported'));
        return;
      }

      const existing = (app.getSettings().instances || []).find((inst) => sameInstance(inst, tab));
      const permitted = existing ? await api.hasOriginPermission(existing.matchPattern) : false;

      if (existing && existing.enabled !== false && permitted) {
        setBanner('connected', app.t('currentTabConnected', { host: tab.host }));
        els.hostChip.hidden = false;
        els.hostChip.className = 'host-chip is-connected';
        els.hostChip.textContent = tab.host;
        els.hostChip.title = app.t('currentTabConnected', { host: tab.host });
      } else if (existing && existing.enabled === false) {
        setBanner('muted', `${tab.host} (${app.t('pausedBadge')})`);
      } else {
        const label = app.t('connectCurrentBtn', { host: tab.host });
        setBanner('ready', app.t('currentTabReadyToConnect', { host: tab.host }));
        els.connectBtn.textContent = label;
        els.connectBtn.hidden = false;
        els.hostChip.hidden = false;
        els.hostChip.className = 'host-chip is-ready';
        els.hostChip.textContent = `+ ${label}`;
        els.hostChip.title = label;
      }
    }

    // ---- Instance list -------------------------------------------------------

    function badgeFor(hasPermission, enabled) {
      if (!hasPermission) return { className: 'is-warn', key: 'permissionMissingBadge' };
      return enabled
        ? { className: 'is-ok', key: 'connectedBadge' }
        : { className: 'is-paused', key: 'pausedBadge' };
    }

    function renderItem(inst, hasPermission) {
      const enabled = inst.enabled !== false;
      const li = doc.createElement('li');
      li.className = `instance-item${enabled ? '' : ' is-paused'}`;

      const info = doc.createElement('div');
      info.className = 'instance-info';
      const host = doc.createElement('span');
      host.className = 'instance-host';
      host.textContent = inst.host || inst.origin;
      host.title = inst.origin;
      const badgeDef = badgeFor(hasPermission, enabled);
      const badge = doc.createElement('span');
      badge.className = `instance-badge ${badgeDef.className}`;
      badge.textContent = app.t(badgeDef.key);
      info.append(host, badge);

      const actions = doc.createElement('div');
      actions.className = 'instance-actions';

      if (!hasPermission) {
        const grant = doc.createElement('button');
        grant.type = 'button';
        grant.className = 'btn btn--small btn--accent';
        grant.textContent = app.t('grantPermissionBtn');
        grant.addEventListener('click', () => connect(inst, app.getActiveTab().id));
        actions.appendChild(grant);
      } else {
        const toggle = doc.createElement('input');
        toggle.type = 'checkbox';
        toggle.className = 'toggle-switch toggle-switch--small';
        toggle.checked = enabled;
        toggle.title = app.t('toggleInstanceTitle');
        toggle.setAttribute('aria-label', `${app.t('toggleInstanceTitle')}: ${inst.host}`);
        toggle.addEventListener('change', () => setEnabled(inst, toggle.checked));
        actions.appendChild(toggle);
      }

      const removeBtn = doc.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'icon-btn';
      removeBtn.title = app.t('removeInstanceTitle');
      removeBtn.setAttribute('aria-label', `${app.t('removeInstanceTitle')}: ${inst.host}`);
      ns.safeHtml.setHtml(removeBtn, TRASH_ICON);
      removeBtn.addEventListener('click', () => remove(inst));
      actions.appendChild(removeBtn);

      li.append(info, actions);
      return li;
    }

    async function renderList() {
      const seq = ++renderSeq;
      const list = instances();
      if (list.length === 0) {
        els.list.replaceChildren();
        els.empty.hidden = false;
        return;
      }

      const permissions = await Promise.all(list.map((inst) => api.hasOriginPermission(inst.matchPattern)));
      if (seq !== renderSeq) return; // a newer render has started

      els.empty.hidden = true;
      els.list.replaceChildren(...list.map((inst, idx) => renderItem(inst, permissions[idx])));
    }

    // ---- Wiring --------------------------------------------------------------

    els.connectBtn.addEventListener('click', () => {
      const tab = app.getActiveTab();
      if (tab.parsed) connect(tab.parsed, tab.id);
    });

    els.hostChip.addEventListener('click', () => {
      const tab = app.getActiveTab();
      if (els.hostChip.classList.contains('is-ready') && tab.parsed) connect(tab.parsed, tab.id);
      else app.switchTab('instances');
    });

    els.form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const parsed = ns.storage.parseInstanceInput(els.input.value);
      if (!parsed.ok) {
        setFeedback(parsed.errorKey);
        return;
      }
      connect(parsed, app.getActiveTab().id);
    });

    async function render() {
      els.count.textContent = String(instances().length);
      renderFeedback();
      await renderBanner();
      await renderList();
    }

    return { render, hasInstances: () => instances().length > 0 };
  }

  popup.createInstancesTab = createInstancesTab;
})(typeof globalThis !== 'undefined' ? globalThis : window);
