'use strict';

/** Advanced search query compiler (Zammad / Elasticsearch syntax). */
const test = require('node:test');
const assert = require('node:assert/strict');
const searchQuery = require('../core/search-query.js');

test('Smart Zammad Search Query Builder follows official Zammad syntax for names, emails, domains & dates', () => {
  // Fixed reference date: Friday, 20 Nov 2026
  const refDate = new Date(2026, 10, 20, 12, 0, 0);

  // Case A: first + last name split into firstname + lastname, single day without range brackets
  const byFullNameToday = searchQuery.buildZammadQuery(
    {
      customer: 'Alex Meyer',
      dateField: 'created_at',
      datePreset: 'today',
      state: 'open_all',
    },
    refDate
  );
  assert.ok(byFullNameToday.includes('customer.firstname:*Alex* AND customer.lastname:*Meyer*'));
  assert.ok(byFullNameToday.includes('article.from:"Alex Meyer"'));
  assert.ok(byFullNameToday.includes('created_at:2026-11-20'));
  assert.ok(byFullNameToday.includes('state.name:(new OR open OR pending*)'));

  // Case B: full email without broken @ wildcards + "last week" range (Mon-Sun)
  const byEmailLastWeek = searchQuery.buildZammadQuery(
    {
      customer: 'alex@acme.example',
      dateField: 'last_contact_at',
      datePreset: 'last_week',
    },
    refDate
  );
  assert.ok(byEmailLastWeek.includes('customer.email:alex@acme.example'));
  assert.ok(byEmailLastWeek.includes('last_contact_at:[2026-11-09 TO 2026-11-15]'));

  // Case C: whole customer domain (@acme.example) + CC header + official Zammad negation !(...)
  const byDomainAndExclude = searchQuery.buildZammadQuery(
    {
      customer: '@acme.example',
      mailAddress: 'billing@acme.example',
      mailDirection: 'cc',
      exclude: 'Autoresponder "Out of Office"',
    },
    refDate
  );
  assert.ok(byDomainAndExclude.includes('customer.email:*@acme.example'));
  assert.ok(byDomainAndExclude.includes('organization.name:*acme.example*'));
  assert.ok(byDomainAndExclude.includes('article.cc:*billing@acme.example*'));
  assert.ok(byDomainAndExclude.includes('!(Autoresponder)'));
  assert.ok(byDomainAndExclude.includes('!("Out of Office")'));
});

test('Search Query Builder prevents double-wrapping if raw Zammad syntax is pasted into a field', () => {
  const pastedClause = '(owner.email:agent@example.com OR article.from:*agent@example.com*)';
  const q = searchQuery.buildZammadQuery({
    text: 'DNS',
    agent: pastedClause,
    agentMode: 'owner',
  });

  assert.equal(q, `DNS AND ${pastedClause}`);
  assert.ok(!q.includes('owner.email:"('));
});

test('Owner and involved-agent roles use owner fields; unknown roles fall back to customer', () => {
  assert.equal(
    searchQuery.buildSmartPersonClause('jane.doe@example.com', 'owner'),
    'owner.email:jane.doe@example.com'
  );
  assert.equal(
    searchQuery.buildSmartPersonClause('Jane Doe', 'agent_involved'),
    '((owner.firstname:*Jane* AND owner.lastname:*Doe*) OR article.from:"Jane Doe")'
  );
  assert.equal(searchQuery.buildSmartPersonClause('@example.com', 'owner'), 'owner.email:*@example.com');
  assert.equal(
    searchQuery.buildSmartPersonClause('"Doe"', 'unknown-role'),
    '(customer.lastname:"Doe" OR article.from:"Doe")'
  );
});

test('Text scope, mail direction, exclusions and open custom ranges compile as documented', () => {
  const q = searchQuery.buildZammadQuery({
    text: 'vpn down',
    textScope: 'title',
    mailAddress: '@example.com',
    mailDirection: 'cc',
    exclude: 'spam "auto reply" !test',
    datePreset: 'custom',
    dateFrom: '2026-11-01',
    dateField: 'created_at',
  });
  assert.equal(
    q,
    'title:"vpn down" AND article.cc:*example.com* AND created_at:[2026-11-01 TO *] AND !(spam) AND !("auto reply") AND !(test)'
  );
  assert.equal(searchQuery.buildZammadQuery({ text: 'printer', textScope: 'body' }), 'article.body:printer');
  assert.equal(
    searchQuery.buildZammadQuery({ mailAddress: 'a@example.com' }),
    '(article.from:*a@example.com* OR article.to:*a@example.com* OR article.cc:*a@example.com*)'
  );
  assert.deepEqual(searchQuery.computeDateRange('custom', '2026-11-10', '2026-11-01'), {
    from: '2026-11-01',
    to: '2026-11-10',
  });
  assert.equal(searchQuery.computeDateRange('nonsense'), null);
});
