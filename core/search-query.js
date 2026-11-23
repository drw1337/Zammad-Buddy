/**
 * Buddy for Zammad – Ticket search query compiler (facade).
 *
 * Compiles the advanced search form into Zammad's Elasticsearch query syntax
 * (checked against the Zammad 6.x / 7.x documentation):
 * - People and domains (see search-query/clauses.js): exact email addresses,
 *   whole domains, `First Last` as firstname AND lastname, single words.
 * - Zammad timestamp fields (`last_contact_at`, `created_at`, `close_at`,
 *   `last_contact_customer_at`, `last_contact_agent_at`): a single day becomes
 *   `field:YYYY-MM-DD` (whole day), a span `field:[from TO to]`.
 * - Exclusions with Zammad's `!(term)` / `!("phrase")`.
 * - Raw Zammad syntax pasted into a field is passed through, not wrapped twice.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = ns.searchQueryParts || {};
  const isNode = typeof module !== 'undefined' && module.exports;
  const dateRange = parts.dateRange || (isNode ? require('./search-query/date-range.js') : null);
  const clauses = parts.clauses || (isNode ? require('./search-query/clauses.js') : null);

  const VALID_DATE_FIELDS = new Set([
    'last_contact_at',
    'created_at',
    'close_at',
    'last_contact_customer_at',
    'last_contact_agent_at',
  ]);

  /** Zammad's default state names. */
  const STATE_CLAUSES = Object.freeze({
    open_all: 'state.name:(new OR open OR pending*)',
    new: 'state.name:new',
    open: 'state.name:open',
    pending: 'state.name:pending*',
    closed: 'state.name:closed',
  });

  const MAIL_FIELDS = Object.freeze({ from: ['from'], to: ['to'], cc: ['cc'], any: ['from', 'to', 'cc'] });

  function normalizeDateField(rawField) {
    const f = String(rawField || '').trim();
    if (f === 'updated_at') return 'last_contact_at';
    return VALID_DATE_FIELDS.has(f) ? f : 'last_contact_at';
  }

  function textClause(rawText, scope) {
    const hasOperators = /\b(AND|OR)\b|[:"*()!]/i.test(rawText);
    const field = { title: 'title', body: 'article.body' }[scope];
    if (!field) return rawText;
    if (hasOperators) return `${field}:(${rawText})`;
    if (rawText.includes(' ')) return `${field}:"${clauses.escapeQuotes(rawText)}"`;
    return scope === 'title' ? `title:*${rawText}*` : `article.body:${rawText}`;
  }

  function mailClause(rawMail, direction) {
    const pattern = `*${rawMail.replace(/^@+/, '')}*`;
    const fields = MAIL_FIELDS[direction] || MAIL_FIELDS.any;
    const list = fields.map((f) => `article.${f}:${pattern}`);
    return list.length === 1 ? list[0] : `(${list.join(' OR ')})`;
  }

  /**
   * Compiles the filter values of the search panel into one query string.
   * @param {object} params see `getValues()` in search-helper/panel/filters.js
   * @param {Date} [nowRef] reference date for relative time ranges (tests)
   * @returns {string}
   */
  function buildZammadQuery(params, nowRef) {
    const p = params && typeof params === 'object' ? params : {};
    const out = [];
    const str = (v) => String(v || '').trim();

    const ticketNumber = str(p.ticketNumber).replace(/^#+/, '').replace(/\s+/g, '');
    if (ticketNumber) out.push(`number:${ticketNumber}`);

    const text = str(p.text);
    if (text) out.push(textClause(text, String(p.textScope || 'all').toLowerCase()));

    const customer = clauses.buildSmartPersonClause(p.customer, 'customer');
    if (customer) out.push(customer);

    if (str(p.organization))
      out.push(`organization.name:${clauses.formatSmartFieldValue(str(p.organization), true)}`);

    const mail = clauses.stripWildcardsAndQuotes(p.mailAddress);
    if (mail) out.push(mailClause(mail, String(p.mailDirection || 'any').toLowerCase()));

    if (str(p.agent)) {
      const role = String(p.agentMode || 'owner').toLowerCase() === 'owner' ? 'owner' : 'agent_involved';
      const agent = clauses.buildSmartPersonClause(str(p.agent), role);
      if (agent) out.push(agent);
    }

    const state = STATE_CLAUSES[String(p.state || 'any').toLowerCase()];
    if (state) out.push(state);

    if (str(p.group)) out.push(`group.name:${clauses.formatSmartFieldValue(str(p.group), true)}`);
    if (str(p.tags)) out.push(`tags:${clauses.formatSmartFieldValue(str(p.tags), false)}`);

    const range = dateRange.computeDateRange(p.datePreset, p.dateFrom, p.dateTo, nowRef);
    if (range) {
      const field = normalizeDateField(p.dateField);
      const singleDay = range.from === range.to && range.from !== '*';
      out.push(singleDay ? `${field}:${range.from}` : `${field}:[${range.from} TO ${range.to}]`);
    }

    out.push(...clauses.buildExcludeClauses(p.exclude));
    return out.join(' AND ');
  }

  function buildZammadSearchHash(query) {
    const clean = String(query || '').trim();
    return clean ? `#search/${encodeURIComponent(clean)}` : '#search';
  }

  function buildZammadSearchUrl(origin, query) {
    return `${String(origin || '').replace(/\/+$/, '')}/${buildZammadSearchHash(query)}`;
  }

  const api = {
    computeDateRange: dateRange.computeDateRange,
    formatSmartFieldValue: clauses.formatSmartFieldValue,
    buildSmartPersonClause: clauses.buildSmartPersonClause,
    buildZammadQuery,
    buildZammadSearchHash,
    buildZammadSearchUrl,
  };

  ns.searchQuery = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
