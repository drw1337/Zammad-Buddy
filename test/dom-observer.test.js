'use strict';

/** Editor context detection (public reply vs. internal note). */
const test = require('node:test');
const assert = require('node:assert/strict');
const domObserver = require('../core/dom-observer.js');
const { MiniDOMParser } = require('./mini-dom.js');

test('Editor context detector distinguishes public replies from internal Zammad notes safely', () => {
  const parser = new MiniDOMParser();

  const publicDoc = parser.parseFromString(`
    <div class="article-add is-open">
      <input type="hidden" name="internal" value="false">
      <input type="hidden" name="type" value="email">
      <div class="textBubble"><div data-name="body" contenteditable="true"></div></div>
    </div>
  `);
  const pubEditor = publicDoc.body.firstElementChild.children[2].firstElementChild;
  const pubCtx = domObserver.detectEditorContext(pubEditor);
  assert.equal(pubCtx.isInternal, false);
  assert.equal(pubCtx.channel, 'email');

  const internalDoc = parser.parseFromString(`
    <div class="article-add is-open">
      <input type="hidden" name="internal" value="true">
      <input type="hidden" name="type" value="note">
      <div class="textBubble is-internal"><div data-name="body" contenteditable="true"></div></div>
    </div>
  `);
  const intEditor = internalDoc.body.firstElementChild.children[2].firstElementChild;
  const intCtx = domObserver.detectEditorContext(intEditor);
  assert.equal(intCtx.isInternal, true);
  assert.equal(intCtx.channel, 'note');

  // Fallback via the .is-internal class without a hidden input (newer Zammad views)
  const classOnlyDoc = parser.parseFromString(`
    <div class="article-add">
      <div class="textBubble is-internal"><div data-name="body" contenteditable="true"></div></div>
    </div>
  `);
  const clsEditor = classOnlyDoc.body.firstElementChild.firstElementChild.firstElementChild;
  assert.equal(domObserver.detectEditorContext(clsEditor).isInternal, true);
});
