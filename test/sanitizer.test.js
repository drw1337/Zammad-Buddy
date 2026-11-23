'use strict';

/** Format Guard sanitizer: paste cleanup, signatures, internal-note markers. */
const test = require('node:test');
const assert = require('node:assert/strict');
const sanitizer = require('../features/format-guard/sanitizer.js');
const { MiniDOMParser } = require('./mini-dom.js');

const opts = { DOMParser: MiniDOMParser, preserveBlockquotes: true };

test('Hidden teal inline colors & fonts are stripped on paste while bold & links stay intact', () => {
  const pasted = `
    <div>Hello <span style="color: #159a8c; font-family: Calibri, sans-serif; font-size: 11pt;">Alex,</span></div>
    <div><span style="color: #159a8c;">The migration of <b>acme-cloud.example</b> completed yesterday.</span></div>
    <div><span style="color: #159a8c;">Regarding </span> <b>portal.acme.example,</b> please add <a href="mailto:ops@acme.example" style="color: #9333ea;">ops@acme.example</a>.</div>
  `;

  const res = sanitizer.cleanPastedHtml(pasted, 'Hello Alex,\nThe migration...', opts);

  assert.equal(res.hadHiddenFormatting, true);
  assert.ok(!res.html.includes('#159a8c'), 'Inline teal color must be stripped');
  assert.ok(!res.html.includes('font-family'), 'Font family must be stripped');
  assert.ok(!res.html.includes('<span'), 'Empty color spans must be unwrapped');
  assert.ok(res.html.includes('<b>acme-cloud.example</b>'), 'Bold formatting must be preserved');
  assert.ok(
    res.html.includes('<a href="mailto:ops@acme.example">ops@acme.example</a>'),
    'Link without inline color must be preserved'
  );
});

test('Semantic inline styles on spans (font-weight: 700, italic) are converted into <strong>/<em>', () => {
  const pasted = `<span style="color: rgb(219, 220, 220); background-color: rgb(40, 42, 48); font-weight: 700; font-style: italic;">important credentials</span>`;

  const res = sanitizer.cleanPastedHtml(pasted, 'important credentials', opts);

  assert.equal(res.hadHiddenFormatting, true);
  assert.ok(!res.html.includes('rgb('), 'Dark-mode RGB colors must be stripped');
  assert.equal(res.html, '<strong><em>important credentials</em></strong>');
});

test('Single-line Outlook snippet (<p class="MsoNormal">...) unwraps without breaking line', () => {
  const outlookSnippet = `<!--StartFragment--><p class="MsoNormal" style="margin:0cm;font-size:11.0pt;font-family:'Calibri',sans-serif;color:#1F497D">Alex,<o:p></o:p></p><!--EndFragment-->`;

  const res = sanitizer.cleanPastedHtml(outlookSnippet, 'Alex,', opts);

  assert.equal(res.hadHiddenFormatting, true);
  assert.equal(res.html, 'Alex,');
});

test('Zammad signature (div[data-signature="true"]) stays 100% protected during scan & cleanup', () => {
  const parser = new MiniDOMParser();
  const doc = parser.parseFromString(`
    <div>Hello <span style="color: #159a8c;">Alex,</span></div>
    <div data-signature="true" data-signature-id="1">
      Best regards<br>
      <span style="color: #666666; font-size: 10pt;">Example Support Team</span>
    </div>
  `);
  const editorEl = doc.body;

  const before = sanitizer.detectHiddenFormatting(editorEl, opts);
  assert.equal(before.count, 1);
  assert.deepEqual(before.categories, ['color']);
  assert.deepEqual(before.colorSamples, ['#159a8c']);

  const cleaned = sanitizer.cleanEditorDom(editorEl, opts);
  assert.equal(cleaned.cleanedCount, 1);

  const after = sanitizer.detectHiddenFormatting(editorEl, opts);
  assert.equal(after.count, 0);
  assert.ok(editorEl.innerHTML.includes('data-signature="true"'));
  assert.ok(editorEl.innerHTML.includes('color: #666666'));
  assert.ok(!editorEl.innerHTML.includes('#159a8c'));
});

test('Blockquotes are preserved by default and cleaned when preserveBlockquotes=false', () => {
  const parser = new MiniDOMParser();
  const doc = parser.parseFromString(`
    <div>Clean reply above.</div>
    <blockquote type="cite"><span style="color: #0055aa;">Quoted customer email</span></blockquote>
  `);

  assert.equal(sanitizer.detectHiddenFormatting(doc.body, { preserveBlockquotes: true }).count, 0);
  assert.equal(sanitizer.detectHiddenFormatting(doc.body, { preserveBlockquotes: false }).count, 1);

  sanitizer.cleanEditorDom(doc.body, { preserveBlockquotes: false });
  assert.ok(!doc.body.innerHTML.includes('#0055aa'));
  assert.ok(doc.body.innerHTML.includes('<blockquote type="cite">Quoted customer email</blockquote>'));
});

test('Headings (<h1>-<h6>) and legacy <font> tags are normalized', () => {
  const html = `<h2 style="color: red;">Domain Notice</h2><font color="#00aa55" face="Verdana" size="4">Status OK</font>`;
  const res = sanitizer.cleanPastedHtml(html, 'Domain Notice\nStatus OK', opts);

  assert.equal(res.hadHiddenFormatting, true);
  assert.equal(res.html, '<div><strong>Domain Notice</strong></div>Status OK');
});

test('Internal note highlights stay clean in internal notes, but trigger Format Guard immediately when switched to public email', () => {
  const parser = new MiniDOMParser();
  const doc = parser.parseFromString(`
    <div>Please check <span style="background-color: #fef08a;">firewall rule #42</span> before replying.</div>
  `);

  // Internal note: no warnings, markers survive cleanup
  const internalReport = sanitizer.detectHiddenFormatting(doc.body, { isInternal: true });
  assert.equal(internalReport.count, 0);

  const internalCleaned = sanitizer.cleanEditorDom(doc.body, { isInternal: true });
  assert.equal(internalCleaned.cleanedCount, 0);
  assert.ok(doc.body.innerHTML.includes('background-color: #fef08a;'));

  // Switched to a public reply: immediate warning and cleanup
  const publicReport = sanitizer.detectHiddenFormatting(doc.body, { isInternal: false });
  assert.equal(publicReport.count, 1);
  assert.deepEqual(publicReport.categories, ['background']);
  assert.deepEqual(publicReport.colorSamples, ['#fef08a']);

  const publicCleaned = sanitizer.cleanEditorDom(doc.body, { isInternal: false });
  assert.equal(publicCleaned.cleanedCount, 1);
  assert.ok(!doc.body.innerHTML.includes('background-color'));
  assert.ok(doc.body.innerHTML.includes('firewall rule #42'));
});

test('Spans mixing note highlight color with foreign fonts are still sanitized in internal notes', () => {
  const dirtyNoteHtml = `<span style="background-color: #fef08a; font-family: Calibri, sans-serif;">pasted snippet</span>`;
  const res = sanitizer.cleanPastedHtml(dirtyNoteHtml, 'pasted snippet', {
    DOMParser: MiniDOMParser,
    isInternal: true,
  });

  assert.equal(res.hadHiddenFormatting, true);
  assert.equal(res.html, 'pasted snippet');
});
