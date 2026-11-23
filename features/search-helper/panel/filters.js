/**
 * Buddy for Zammad – Filter form of the advanced search panel.
 *
 * Builds the inputs (search term, customer, organization, time range, state and
 * the collapsible "more filters") and exposes their values in the shape that
 * `ZammadBuddy.searchQuery.buildZammadQuery` expects.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.searchPanelParts = ns.searchPanelParts || {});

  const SCOPE_OPTIONS = [
    { value: 'all', key: 'scopeAll' },
    { value: 'title', key: 'scopeTitle' },
    { value: 'body', key: 'scopeBody' },
  ];

  const DATE_FIELD_OPTIONS = [
    { value: 'last_contact_at', key: 'dateFieldActivity' },
    { value: 'created_at', key: 'dateFieldCreated' },
    { value: 'close_at', key: 'dateFieldClosed' },
    { value: 'last_contact_customer_at', key: 'dateFieldCustomer' },
    { value: 'last_contact_agent_at', key: 'dateFieldAgent' },
  ];

  /** Rolling ranges relative to today. */
  const DATE_RELATIVE = [
    { value: 'any', key: 'dateAny' },
    { value: 'today', key: 'dateToday' },
    { value: 'yesterday', key: 'dateYesterday' },
    { value: 'last_7d', key: 'dateLast7d' },
    { value: 'last_30d', key: 'dateLast30d' },
  ];

  /** Calendar periods (weeks start on Monday) and a custom range. */
  const DATE_CALENDAR = [
    { value: 'this_week', key: 'dateThisWeek' },
    { value: 'last_week', key: 'dateLastWeek' },
    { value: 'this_month', key: 'dateThisMonth' },
    { value: 'last_month', key: 'dateLastMonth' },
    { value: 'custom', key: 'dateCustom' },
  ];

  const STATES = [
    { value: 'any', key: 'stateAny' },
    { value: 'open_all', key: 'stateOpenAll' },
    { value: 'new', key: 'stateNew' },
    { value: 'open', key: 'stateOpen' },
    { value: 'pending', key: 'statePending' },
    { value: 'closed', key: 'stateClosed' },
  ];

  const MAIL_DIRECTIONS = [
    { value: 'any', key: 'mailDirAny' },
    { value: 'from', key: 'mailDirFrom' },
    { value: 'to', key: 'mailDirTo' },
    { value: 'cc', key: 'mailDirCc' },
  ];

  const AGENT_MODES = [
    { value: 'owner', key: 'agentModeOwner' },
    { value: 'involved', key: 'agentModeInvolved' },
  ];

  const CHEVRON_ICON =
    '<svg class="zb-chevron" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5L8 6L4.5 9.5"/></svg>';

  /**
   * @param {ReturnType<typeof parts.createKit>} kit
   * @param {{ t: (key: string, params?: object) => string, onChange: () => void }} options
   */
  function createFilters(kit, options) {
    const state = { datePreset: 'any', ticketState: 'any' };

    // Text inputs and selects, keyed by the query compiler's field names.
    const f = {
      text: kit.textInput('searchTextPlaceholder'),
      textScope: kit.select('zb-field', SCOPE_OPTIONS),
      customer: kit.textInput('searchCustomerPlaceholder'),
      organization: kit.textInput('searchOrgPlaceholder'),
      dateField: kit.select('zb-field zb-field--inline', DATE_FIELD_OPTIONS),
      dateFrom: kit.el('input', { type: 'date', className: 'zb-field', title: 'dateCustom' }),
      dateTo: kit.el('input', { type: 'date', className: 'zb-field', title: 'dateCustom' }),
      mailDirection: kit.select('zb-field', MAIL_DIRECTIONS),
      mailAddress: kit.textInput('searchMailPlaceholder'),
      agentMode: kit.select('zb-field', AGENT_MODES),
      agent: kit.textInput('searchAgentPlaceholder'),
      ticketNumber: kit.textInput('searchTicketNumPlaceholder'),
      group: kit.textInput('searchGroupPlaceholder'),
      tags: kit.textInput('searchTagsPlaceholder'),
      exclude: kit.textInput('searchExcludePlaceholder'),
    };
    const DEFAULTS = {
      textScope: 'all',
      dateField: 'last_contact_at',
      mailDirection: 'any',
      agentMode: 'owner',
    };
    const MORE_FIELDS = ['mailAddress', 'agent', 'ticketNumber', 'group', 'tags', 'exclude'];

    // 1. Search term and scope
    const textGroup = kit.group('searchTextLabel', kit.row('zb-row-search', [f.text, f.textScope]));

    // 2. Customer and organization
    const personRow = kit.row('zb-row-two', [
      kit.group('searchCustomerLabel', f.customer),
      kit.group('searchOrgLabel', f.organization),
    ]);

    // 3. Time range
    const customDates = kit.row('zb-row-equal zb-custom-dates', [
      kit.group('dateFromLabel', f.dateFrom),
      kit.group('dateToLabel', f.dateTo),
    ]);
    const selectPreset = (value) => {
      state.datePreset = value;
      sync();
      options.onChange();
      if (value === 'custom') f.dateFrom.focus();
    };
    const dateRelative = kit.segments(DATE_RELATIVE, selectPreset);
    const dateCalendar = kit.segments(DATE_CALENDAR, selectPreset);
    const dateFieldWrap = kit.row('zb-date-field', [
      kit.el('label', { className: 'zb-label zb-label--muted', i18n: 'dateFieldPrefix' }),
      f.dateField,
    ]);
    dateFieldWrap.firstChild.htmlFor = f.dateField.id = 'zb-search-date-field';
    const dateGroup = kit.row('zb-group', [
      kit.row('zb-group-head', [
        kit.el('span', { className: 'zb-label', i18n: 'searchDateLabel' }),
        dateFieldWrap,
      ]),
      kit.row('zb-seg-line', [
        kit.el('span', { className: 'zb-seg-caption', i18n: 'dateGroupDays' }),
        dateRelative.element,
      ]),
      kit.row('zb-seg-line', [
        kit.el('span', { className: 'zb-seg-caption', i18n: 'dateGroupCalendar' }),
        dateCalendar.element,
      ]),
      customDates,
    ]);

    // 4. Ticket state
    const stateSegments = kit.segments(STATES, (value) => {
      state.ticketState = value;
      sync();
      options.onChange();
    });
    const stateGroup = kit.row('zb-group', [
      kit.el('span', { className: 'zb-label', i18n: 'searchStateLabel' }),
      stateSegments.element,
    ]);

    // 5. More filters (collapsed)
    const moreBadge = kit.el('span', { className: 'zb-more-badge' });
    moreBadge.hidden = true;
    const moreLeft = kit.el('span', { className: 'zb-more-left' });
    ns.safeHtml.setHtml(moreLeft, CHEVRON_ICON);
    moreLeft.appendChild(kit.el('span', { i18n: 'searchMoreFilters' }));
    const details = kit.el('details', { className: 'zb-more' });
    const summary = kit.el('summary', { className: 'zb-more-summary' });
    summary.appendChild(moreLeft);
    summary.appendChild(moreBadge);
    details.appendChild(summary);
    details.appendChild(
      kit.row('zb-more-body', [
        kit.row('zb-row-equal', [
          kit.group('searchMailLabel', kit.row('zb-combo-row', [f.mailDirection, f.mailAddress])),
          kit.group('searchAgentLabel', kit.row('zb-combo-row zb-combo-row--agent', [f.agentMode, f.agent])),
        ]),
        kit.row('zb-row-equal', [
          kit.group('searchTicketNumLabel', f.ticketNumber),
          kit.group('searchGroupLabel', f.group),
        ]),
        kit.row('zb-row-equal', [
          kit.group('searchTagsLabel', f.tags),
          kit.group('searchExcludeLabel', f.exclude),
        ]),
      ])
    );

    for (const control of Object.values(f)) {
      control.addEventListener('input', options.onChange);
      control.addEventListener('change', options.onChange);
    }

    function sync() {
      dateRelative.setActive(state.datePreset);
      dateCalendar.setActive(state.datePreset);
      stateSegments.setActive(state.ticketState);
      customDates.hidden = state.datePreset !== 'custom';
    }

    function updateMoreBadge() {
      const count = MORE_FIELDS.filter((key) => f[key].value.trim()).length;
      moreBadge.hidden = count === 0;
      moreBadge.textContent = count > 0 ? options.t('searchMoreActiveBadge', { count }) : '';
    }

    /** Values for `searchQuery.buildZammadQuery`. */
    function getValues() {
      const values = { datePreset: state.datePreset, state: state.ticketState };
      for (const [key, control] of Object.entries(f)) values[key] = control.value;
      return values;
    }

    function reset() {
      for (const [key, control] of Object.entries(f)) control.value = DEFAULTS[key] || '';
      state.datePreset = 'any';
      state.ticketState = 'any';
      sync();
    }

    sync();

    return {
      elements: [textGroup, personRow, dateGroup, stateGroup, details],
      getValues,
      reset,
      updateMoreBadge,
      focusFirst: () => f.text.focus(),
    };
  }

  parts.createFilters = createFilters;
})(typeof globalThis !== 'undefined' ? globalThis : window);
