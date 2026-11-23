'use strict';

/** Editor commands: links, tables, preview scrubbing, lists, code blocks. */
const test = require('node:test');
const assert = require('node:assert/strict');
const sanitizer = require('../features/format-guard/sanitizer.js');
const wysiwygCommands = require('../features/wysiwyg/commands.js');
const { MiniDOMParser } = require('./mini-dom.js');

const opts = { DOMParser: MiniDOMParser, preserveBlockquotes: true };

test('WYSIWYG link normalizer auto-completes https:// and mailto: while blocking unsafe schemes', () => {
  assert.deepEqual(wysiwygCommands.normalizeSafeLinkUrl('docs.example.com/setup'), {
    ok: true,
    url: 'https://docs.example.com/setup',
  });
  assert.deepEqual(wysiwygCommands.normalizeSafeLinkUrl('support@example.org'), {
    ok: true,
    url: 'mailto:support@example.org',
  });
  assert.deepEqual(wysiwygCommands.normalizeSafeLinkUrl('+49 30 1234567'), {
    ok: true,
    url: 'tel:+49301234567',
  });
  assert.equal(wysiwygCommands.normalizeSafeLinkUrl('javascript:alert(1)').ok, false);
  assert.equal(wysiwygCommands.normalizeSafeLinkUrl('data:text/html,<script>').ok, false);
  assert.equal(wysiwygCommands.normalizeSafeLinkUrl('').ok, false);
});

test('WYSIWYG table builder emits clean semantic HTML with zero Format Guard warnings', () => {
  const tableHtml = wysiwygCommands.buildTableHtml(3, 4, { withHeader: true });
  assert.ok(
    tableHtml.includes('<thead><tr><th><br></th><th><br></th><th><br></th><th><br></th></tr></thead>')
  );
  assert.ok(tableHtml.includes('<tbody>'));

  const parser = new MiniDOMParser();
  const doc = parser.parseFromString(tableHtml);
  assert.equal(sanitizer.detectHiddenFormatting(doc.body, opts).count, 0);
});

test('Email preview HTML sanitizer strips scripts/handlers while preserving real outgoing styles', () => {
  const raw =
    `<div onclick="evil()">Hello <span style="color: #159a8c;">Alex</span></div>` +
    `<script>window.pwned = true;</script>` +
    `<a href="javascript:evil()">bad</a>` +
    `<div data-signature="true"><span style="color: #666666;">Support</span></div>`;

  const safe = wysiwygCommands.sanitizePreviewHtml(raw, MiniDOMParser);
  assert.ok(!safe.includes('<script'));
  assert.ok(!safe.includes('onclick'));
  assert.ok(!safe.includes('javascript:'));
  assert.ok(safe.includes('color: #159a8c;'));
  assert.ok(safe.includes('data-signature="true"'));
});

test('Nested list indentation & outdentation creates clean Word-like sub-lists', () => {
  const parser = new MiniDOMParser();
  const doc = parser.parseFromString('<ul><li>Main item</li><li>Sub candidate</li></ul>');
  const ul = doc.body.firstElementChild;
  const secondLi = ul.children[1];

  // Indent below the first <li> -> creates a real nested <ul>
  const indented = wysiwygCommands.indentListItemDom(doc, secondLi);
  assert.equal(indented, true);
  assert.equal(doc.body.innerHTML, '<ul><li>Main item<ul><li>Sub candidate</li></ul></li></ul>');

  // Outdent again -> back on the top level, empty sub-list removed
  const outdented = wysiwygCommands.outdentListItemDom(doc, secondLi);
  assert.equal(outdented, true);
  assert.equal(doc.body.innerHTML, '<ul><li>Main item</li><li>Sub candidate</li></ul>');
});

test('Code snippet builder highlights syntax without triggering Format Guard warnings', () => {
  const codeHtml = wysiwygCommands.buildCodeBlockHtml(
    '{\n  "host": "api.example.com",\n  "port": 8443,\n  "tls": true\n}',
    'json'
  );

  assert.ok(codeHtml.includes('<strong>[JSON]</strong>'));
  assert.ok(codeHtml.includes('color: #0369a1;'));
  assert.ok(codeHtml.includes('color: #15803d;'));

  const parser = new MiniDOMParser();
  const doc = parser.parseFromString(codeHtml);

  // Must not trigger a hidden-style warning in public emails
  const report = sanitizer.detectHiddenFormatting(doc.body, { isInternal: false });
  assert.equal(report.count, 0);

  // Survives cleanEditorDom unchanged
  sanitizer.cleanEditorDom(doc.body, { isInternal: false });
  assert.ok(doc.body.innerHTML.includes('color: #0369a1;'));
});

test('Code highlighter tokenizes per language and escapes everything else', () => {
  const sql = wysiwygCommands.highlightCodeToHtml("SELECT * FROM t WHERE a = 'x' -- note", 'sql');
  assert.match(sql, /<span style="color: #7c3aed;">SELECT<\/span>/);
  assert.match(sql, /<span style="color: #15803d;">'x'<\/span>/);
  assert.match(sql, /<span style="color: #64748b;">-- note<\/span>/);

  const json = wysiwygCommands.highlightCodeToHtml('{"key": "value", "n": 1}', 'json');
  assert.match(json, /<span style="color: #0369a1;">&quot;key&quot;:<\/span>/);
  assert.match(json, /<span style="color: #15803d;">&quot;value&quot;<\/span>/);

  const html = wysiwygCommands.highlightCodeToHtml('<script>alert(1)</script>', 'plain');
  assert.equal(html, '&lt;script&gt;alert(1)&lt;/script&gt;');

  const unknown = wysiwygCommands.buildCodeBlockHtml('x', 'does-not-exist');
  assert.ok(unknown.startsWith('<pre><code>x'), 'unknown languages fall back to plain without caption');
});

test('Emoji filter matches English and German keywords', () => {
  const all = wysiwygCommands.filterEmojis('');
  assert.equal(all.length, wysiwygCommands.EMOJI_CATALOG.length);
  assert.ok(wysiwygCommands.filterEmojis('haken').some((e) => e.ch === '✅'));
  assert.ok(wysiwygCommands.filterEmojis('warning').some((e) => e.ch === '⚠️'));
  assert.equal(wysiwygCommands.filterEmojis('zzz-no-match').length, 0);
});

test('Preview scrubber removes styles sheets, comments and script-capable URLs but keeps inline images', () => {
  const raw =
    '<style>body{display:none}</style><!-- hidden -->' +
    '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>' +
    '<img src="data:image/png;base64,iVBORw0KGgo=" alt="ok">' +
    '<img src="data:image/svg+xml;base64,PHN2Zz4=" alt="svg">' +
    '<a href=" JavaScript:evil()">y</a>';
  const safe = wysiwygCommands.sanitizePreviewHtml(raw, MiniDOMParser);
  assert.ok(!safe.includes('<style'));
  assert.ok(!safe.includes('hidden'));
  assert.ok(!safe.includes('data:text/html'));
  assert.ok(!safe.includes('data:image/svg+xml'));
  assert.ok(!/javascript:/i.test(safe));
  assert.ok(safe.includes('data:image/png;base64'));
});

test('Link normalizer handles phone numbers, localhost, anchors and blocked schemes', () => {
  assert.equal(wysiwygCommands.normalizeSafeLinkUrl('+49 30 123456').url, 'tel:+4930123456');
  assert.equal(wysiwygCommands.normalizeSafeLinkUrl('localhost:3000/x').url, 'https://localhost:3000/x');
  assert.equal(wysiwygCommands.normalizeSafeLinkUrl('#section').url, '#section');
  for (const bad of ['data:text/html,x', 'vbscript:x', 'file:///etc/passwd', '', '   ', 'not a url']) {
    assert.equal(wysiwygCommands.normalizeSafeLinkUrl(bad).ok, false, bad);
  }
});

test('Table builder clamps the size and can omit the header row', () => {
  const big = wysiwygCommands.buildTableHtml(99, 99);
  assert.equal((big.match(/<th>/g) || []).length, 10);
  assert.equal((big.match(/<tr>/g) || []).length, 12);
  const noHeader = wysiwygCommands.buildTableHtml(2, 2, { withHeader: false });
  assert.ok(!noHeader.includes('<thead>'));
  assert.equal((noHeader.match(/<td>/g) || []).length, 4);
});

test('Code block colors match the colors the Format Guard allows inside <pre>', () => {
  const sanitizer = require('../features/format-guard/sanitizer.js');
  const allowed = Object.fromEntries(sanitizer.CODE_SYNTAX_PALETTE.map((e) => [e.token, e.hex]));
  assert.deepEqual({ ...wysiwygCommands.SYNTAX_HEX }, allowed);
});
