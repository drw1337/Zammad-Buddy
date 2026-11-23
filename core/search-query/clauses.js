/**
 * Buddy for Zammad – Search clause builders.
 *
 * Turns what agents type (names, email addresses, domains, words to exclude)
 * into Zammad / Elasticsearch clauses, and passes through raw Zammad syntax
 * that was pasted into a field instead of wrapping it a second time.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const parts = (ns.searchQueryParts = ns.searchQueryParts || {});
  const isNode = typeof module !== 'undefined' && module.exports;

  const EMAIL = /^[^\s@":()]+@[^\s@":()]+\.[^\s@":()]{2,}$/;
  const DOMAIN = /^@?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;

  function escapeQuotes(val) {
    return String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function stripWildcardsAndQuotes(token) {
    return String(token || '')
      .replace(/^["'*()]+|["'*()]+$/g, '')
      .trim();
  }

  /**
   * Detects raw Zammad syntax pasted into a field (e.g. `owner.email:...` or
   * `(customer.lastname:*Foo* OR ...)`).
   * @returns {{ kind: 'empty' | 'passthrough_clause' | 'clean_text', value: string }}
   */
  function inspectRawSyntaxInput(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return { kind: 'empty', value: '' };

    if (/[a-z_]+(\.[a-z_]+)?\s*:/i.test(trimmed)) {
      // Complex expression: keep it, just make sure it is parenthesized.
      if (/\b(AND|OR)\b|[()]/i.test(trimmed)) {
        const balanced = trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed : `(${trimmed})`;
        return { kind: 'passthrough_clause', value: balanced };
      }
      // Simple `field:value`: keep only the value.
      const extracted = stripWildcardsAndQuotes(trimmed.slice(trimmed.indexOf(':') + 1));
      if (extracted) return { kind: 'clean_text', value: extracted };
    }
    return { kind: 'clean_text', value: trimmed };
  }

  /**
   * Formats a single field value (e.g. `organization.name`, `group.name`, `tags`):
   * phrases are quoted, existing wildcards kept, plain words optionally wrapped in `*…*`.
   */
  function formatSmartFieldValue(raw, useWildcards = true) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed;
    if (/[\s:()[\]{}/\\]/.test(trimmed)) return `"${escapeQuotes(trimmed)}"`;
    if (trimmed.includes('*') || trimmed.includes('?')) return trimmed;
    return useWildcards ? `*${trimmed}*` : trimmed;
  }

  /**
   * Clause templates per role and input kind.
   * phrase(q) · email(e) · domain(d) · fullName(first, last, quotedFull) · single(t)
   */
  const PERSON_TEMPLATES = Object.freeze({
    customer: {
      phrase: (q) => `(customer.lastname:"${q}" OR article.from:"${q}")`,
      email: (e) => `(customer.email:${e} OR article.from:*${e}*)`,
      domain: (d) => `(customer.email:*@${d} OR organization.name:*${d}* OR article.from:*${d}*)`,
      fullName: (f, l, full) =>
        `((customer.firstname:*${f}* AND customer.lastname:*${l}*) OR article.from:${full})`,
      single: (t) =>
        `(customer.lastname:*${t}* OR customer.firstname:*${t}* OR customer.email:*${t}* OR article.from:*${t}*)`,
    },
    owner: {
      phrase: (q) => `(owner.lastname:"${q}" OR owner.firstname:"${q}")`,
      email: (e) => `owner.email:${e}`,
      domain: (d) => `owner.email:*@${d}`,
      fullName: (f, l) => `(owner.firstname:*${f}* AND owner.lastname:*${l}*)`,
      single: (t) => `(owner.lastname:*${t}* OR owner.firstname:*${t}* OR owner.email:*${t}*)`,
    },
    agent_involved: {
      phrase: (q) => `(owner.lastname:"${q}" OR article.from:"${q}")`,
      email: (e) => `(owner.email:${e} OR article.from:*${e}*)`,
      domain: (d) => `(owner.email:*@${d} OR article.from:*${d}*)`,
      fullName: (f, l, full) =>
        `((owner.firstname:*${f}* AND owner.lastname:*${l}*) OR article.from:${full})`,
      single: (t) => `(owner.lastname:*${t}* OR owner.firstname:*${t}* OR article.from:*${t}*)`,
    },
  });

  /**
   * Builds a clause for a customer or agent:
   * - email address -> exact `.email:` (no broken `@` wildcards)
   * - domain (`@example.com` / `example.com`) -> all tickets of that domain
   * - first + last name -> `firstname` AND `lastname`
   * - single word -> last name, first name, email and article header
   * @param {string} rawPerson
   * @param {'customer' | 'owner' | 'agent_involved'} [role]
   */
  function buildSmartPersonClause(rawPerson, role = 'customer') {
    const inspected = inspectRawSyntaxInput(rawPerson);
    if (inspected.kind === 'empty') return '';
    if (inspected.kind === 'passthrough_clause') return inspected.value;

    const tpl = PERSON_TEMPLATES[role] || PERSON_TEMPLATES.customer;
    const clean = inspected.value;

    if (clean.length > 2 && clean.startsWith('"') && clean.endsWith('"')) {
      const inner = escapeQuotes(clean.slice(1, -1).trim());
      return inner ? tpl.phrase(inner) : '';
    }
    if (EMAIL.test(clean)) return tpl.email(clean);
    if (DOMAIN.test(clean)) return tpl.domain(clean.replace(/^@+/, ''));

    const words = clean.split(/\s+/).map(stripWildcardsAndQuotes).filter(Boolean);
    if (words.length >= 2) {
      return tpl.fullName(words[0], words[words.length - 1], `"${escapeQuotes(words.join(' '))}"`);
    }

    const token = words[0] || stripWildcardsAndQuotes(clean);
    return token ? tpl.single(token) : '';
  }

  /** Official Zammad exclusion syntax `!(word)` / `!("phrase")`. */
  function buildExcludeClauses(rawExclude) {
    const trimmed = String(rawExclude || '').trim();
    if (!trimmed) return [];

    const clauses = [];
    const re = /"([^"]+)"|(\S+)/g;
    let m;
    while ((m = re.exec(trimmed)) !== null) {
      if (m[1]) {
        clauses.push(`!("${escapeQuotes(m[1])}")`);
        continue;
      }
      const word = m[2].replace(/^[-!]+/, '');
      if (!word) continue;
      clauses.push(/[:()[\]/\\]/.test(word) ? `!("${escapeQuotes(word)}")` : `!(${word})`);
    }
    return clauses;
  }

  const api = {
    escapeQuotes,
    stripWildcardsAndQuotes,
    inspectRawSyntaxInput,
    formatSmartFieldValue,
    buildSmartPersonClause,
    buildExcludeClauses,
  };

  parts.clauses = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
