/**
 * Buddy for Zammad – Calendar ranges for the advanced search.
 *
 * Presets are computed in local time and returned as `YYYY-MM-DD`; weeks start
 * on Monday (ISO 8601). `*` marks an open end of a custom range.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.searchQueryParts = ns.searchQueryParts || {});
  const isNode = typeof module !== 'undefined' && module.exports;

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  const pad2 = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  function midnight(baseDate) {
    const d = baseDate instanceof Date ? new Date(baseDate.getTime()) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(d, delta) {
    const copy = new Date(d.getTime());
    copy.setDate(copy.getDate() + delta);
    return copy;
  }

  function mondayOf(d) {
    const day = d.getDay(); // 0 = Sunday
    return addDays(d, day === 0 ? -6 : 1 - day);
  }

  const span = (from, to) => ({ from: iso(from), to: iso(to) });

  /** Preset -> range relative to `today` (midnight). */
  const PRESETS = Object.freeze({
    today: (today) => span(today, today),
    yesterday: (today) => span(addDays(today, -1), addDays(today, -1)),
    this_week: (today) => span(mondayOf(today), today),
    last_week: (today) => span(addDays(mondayOf(today), -7), addDays(mondayOf(today), -1)),
    last_7d: (today) => span(addDays(today, -6), today),
    last_30d: (today) => span(addDays(today, -29), today),
    this_month: (today) => span(new Date(today.getFullYear(), today.getMonth(), 1), today),
    last_month: (today) =>
      span(
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0)
      ),
  });

  function customRange(customFrom, customTo) {
    const clean = (v) => (ISO_DATE.test(String(v || '').trim()) ? String(v).trim() : '');
    const from = clean(customFrom);
    const to = clean(customTo);
    if (!from && !to) return null;
    if (from && to) return from > to ? { from: to, to: from } : { from, to };
    return { from: from || '*', to: to || '*' };
  }

  /**
   * @param {string} preset 'any' | 'today' | … | 'custom'
   * @param {string} [customFrom] `YYYY-MM-DD` for 'custom'
   * @param {string} [customTo] `YYYY-MM-DD` for 'custom'
   * @param {Date} [nowRef] reference date (tests)
   * @returns {{ from: string, to: string } | null}
   */
  function computeDateRange(preset, customFrom, customTo, nowRef) {
    const p = String(preset || 'any')
      .trim()
      .toLowerCase();
    if (p === 'custom') return customRange(customFrom, customTo);
    const build = PRESETS[p];
    return build ? build(midnight(nowRef)) : null;
  }

  const api = { computeDateRange };

  parts.dateRange = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
