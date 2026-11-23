/**
 * Buddy for Zammad – Editor command facade.
 *
 * Bundles the editor modules in `./editor/` into one stable API that the
 * toolbar and the tests use. All commands work directly on Zammad's native
 * `[data-name="body"][contenteditable="true"]`: no iframe, no replacement
 * editor, so `::` text modules, `@` mentions, image uploads, the undo stack
 * and `div[data-signature="true"]` keep working.
 *
 * Module map:
 *   dom.js               selection, signature guard, DOM primitives
 *   code-highlight.js    code blocks with inline-colored syntax tokens
 *   emoji-catalog.js     bilingual emoji catalog
 *   links.js             safe link insertion / editing
 *   note-highlight.js    highlight markers for internal notes
 *   blocks.js            native inline commands, quotes, inline code, rules
 *   lists.js             Word-style nested lists
 *   tables.js            tables and Tab key navigation
 *   formatting.js        clear formatting, toolbar state
 *   preview-sanitizer.js HTML scrubber for the email preview
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;

  const load = (key, file) => editor[key] || (isNode ? require(`./editor/${file}`) : null);

  const dom = load('dom', 'dom.js');
  const codeHighlight = load('codeHighlight', 'code-highlight.js');
  const emojiCatalog = load('emojiCatalog', 'emoji-catalog.js');
  const links = load('links', 'links.js');
  const noteHighlight = load('noteHighlight', 'note-highlight.js');
  const blocks = load('blocks', 'blocks.js');
  const lists = load('lists', 'lists.js');
  const tables = load('tables', 'tables.js');
  const formatting = load('formatting', 'formatting.js');
  const previewSanitizer = load('previewSanitizer', 'preview-sanitizer.js');

  const missing = Object.entries({
    dom,
    codeHighlight,
    emojiCatalog,
    links,
    noteHighlight,
    blocks,
    lists,
    tables,
    formatting,
    previewSanitizer,
  })
    .filter(([, mod]) => !mod)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`[Buddy for Zammad] Editor modules not loaded: ${missing.join(', ')}`);
  }

  const api = Object.freeze({
    // Data
    HIGHLIGHT_PALETTE: noteHighlight.HIGHLIGHT_PALETTE,
    SYNTAX_HEX: codeHighlight.SYNTAX_HEX,
    CODE_LANGUAGES: codeHighlight.CODE_LANGUAGES,
    EMOJI_CATALOG: emojiCatalog.EMOJI_CATALOG,
    filterEmojis: emojiCatalog.filterEmojis,

    // Pure builders
    normalizeSafeLinkUrl: links.normalizeSafeLinkUrl,
    buildTableHtml: tables.buildTableHtml,
    highlightCodeToHtml: codeHighlight.highlightCodeToHtml,
    buildCodeBlockHtml: codeHighlight.buildCodeBlockHtml,
    sanitizePreviewHtml: previewSanitizer.sanitizePreviewHtml,

    // Selection
    isInsideSignature: dom.isInsideSignature,
    findClosestTag: dom.findClosestTag,
    findClosestNoteHighlight: noteHighlight.findClosestNoteHighlight,
    saveSelectionRange: dom.saveSelectionRange,
    restoreSelectionRange: dom.restoreSelectionRange,
    extractRangePlainTextWithLineBreaks: blocks.extractRangePlainTextWithLineBreaks,

    // Commands
    execInlineCommand: blocks.execInlineCommand,
    indentListItemDom: lists.indentListItemDom,
    outdentListItemDom: lists.outdentListItemDom,
    indentListOrBlock: lists.indentListOrBlock,
    outdentListOrBlock: lists.outdentListOrBlock,
    toggleBlockquote: blocks.toggleBlockquote,
    toggleInlineCode: blocks.toggleInlineCode,
    insertCodeSnippetAtSelection: blocks.insertCodeSnippetAtSelection,
    insertEmojiAtSelection: blocks.insertEmojiAtSelection,
    insertHorizontalRule: blocks.insertHorizontalRule,
    inspectLinkAtSelection: links.inspectLinkAtSelection,
    applyLink: links.applyLink,
    removeLink: links.removeLink,
    insertTableAtSelection: tables.insertTableAtSelection,
    applyNoteHighlight: noteHighlight.applyNoteHighlight,
    removeNoteHighlight: noteHighlight.removeNoteHighlight,
    clearSelectionFormatting: formatting.clearSelectionFormatting,
    handleTabNavigation: tables.handleTabNavigation,
    queryToolbarState: formatting.queryToolbarState,
  });

  ns.wysiwygCommands = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
