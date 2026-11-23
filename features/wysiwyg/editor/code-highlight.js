/**
 * Buddy for Zammad – Dependency-free syntax highlighter for code blocks.
 *
 * Produces nothing but `<pre><code>` with `<span style="color: …;">` tokens,
 * the only markup that reliably survives Zammad's server-side HTML sanitizer
 * and email clients. Colors are tuned for light email backgrounds; the
 * stylesheet brightens them inside Zammad's dark mode.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;
  const dom = editor.dom || (isNode ? require('./dom.js') : null);
  const { escapeHtml } = dom;

  /** Token type -> inline color. Keep in sync with the dark-mode overrides in wysiwyg.css. */
  const SYNTAX_HEX = Object.freeze({
    kw: '#7c3aed',
    str: '#15803d',
    key: '#0369a1',
    num: '#b45309',
    cmt: '#64748b',
  });

  const CODE_LANGUAGES = Object.freeze([
    Object.freeze({ id: 'bash', label: 'Bash / Shell' }),
    Object.freeze({ id: 'powershell', label: 'PowerShell' }),
    Object.freeze({ id: 'json', label: 'JSON' }),
    Object.freeze({ id: 'sql', label: 'SQL' }),
    Object.freeze({ id: 'javascript', label: 'JavaScript / TS' }),
    Object.freeze({ id: 'python', label: 'Python' }),
    Object.freeze({ id: 'yaml', label: 'YAML / Config' }),
    Object.freeze({ id: 'html', label: 'HTML / XML' }),
    Object.freeze({ id: 'php', label: 'PHP' }),
    Object.freeze({ id: 'css', label: 'CSS' }),
    Object.freeze({ id: 'plain', label: 'Plain / Log' }),
  ]);

  /**
   * One grammar per language: a global regex whose capture groups are mapped
   * to token types by `classify`. Unmatched text is emitted escaped.
   */
  const GRAMMARS = Object.freeze({
    json: {
      re: /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g,
      classify: (m) => (m[1] ? (m[2] ? 'key' : 'str') : m[3] ? 'kw' : 'num'),
    },
    shell: {
      re: /(#[^\n]*)|("(?:\\.|[^"\\])*"|'[^']*')|(\$[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+\})|(\s--?[a-zA-Z0-9_-]+)|\b(sudo|curl|wget|grep|awk|sed|chmod|chown|systemctl|journalctl|docker|kubectl|git|ssh|scp|apt|dnf|yum|npm|node|if|then|else|fi|for|in|do|done|export|echo|return|exit|Get-[A-Za-z]+|Set-[A-Za-z]+|New-[A-Za-z]+|Remove-[A-Za-z]+|Invoke-[A-Za-z]+|Start-[A-Za-z]+|Stop-[A-Za-z]+|Restart-[A-Za-z]+|Test-[A-Za-z]+)\b/g,
      classify: (m) => (m[1] ? 'cmt' : m[2] ? 'str' : m[3] || m[4] ? 'key' : m[5] ? 'kw' : null),
    },
    sql: {
      re: /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:''|\\.|[^'])*')|\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|AND|OR|NOT|NULL|IS|IN|EXISTS|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|BEGIN|COMMIT|ROLLBACK)\b|\b\d+(?:\.\d+)?\b/gi,
      classify: (m) => (m[1] ? 'cmt' : m[2] ? 'str' : m[3] ? 'kw' : 'num'),
    },
    yaml: {
      re: /(#[^\n]*)|("(?:\\.|[^"\\])*"|'[^']*')|(^[ \t-]*[a-zA-Z0-9_.-]+(?=\s*:))|\b(true|false|null|yes|no|on|off)\b|\b\d+(?:\.\d+)?\b/gm,
      classify: (m) => (m[1] ? 'cmt' : m[2] ? 'str' : m[3] ? 'key' : m[4] ? 'kw' : 'num'),
    },
    html: {
      re: /(<!--[\s\S]*?-->)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(<\/?[a-zA-Z0-9:-]+|\/?>)|(\b[a-zA-Z_:][a-zA-Z0-9_.:-]*(?=\s*=))/g,
      classify: (m) => (m[1] ? 'cmt' : m[2] ? 'str' : m[3] ? 'kw' : m[4] ? 'key' : null),
    },
    css: {
      re: /(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([a-zA-Z-]+(?=\s*:))|(!important\b)|(#[0-9a-fA-F]{3,8}\b|-?\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b)/g,
      classify: (m) => (m[1] ? 'cmt' : m[2] ? 'str' : m[3] ? 'key' : m[4] ? 'kw' : m[5] ? 'num' : null),
    },
    // Shared C-like grammar for JavaScript / TypeScript, Python and PHP.
    script: {
      re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\$[a-zA-Z_][a-zA-Z0-9_]*)|\b(const|let|var|function|async|await|return|if|elif|else|for|foreach|while|do|switch|case|break|continue|try|catch|except|finally|throw|raise|new|class|extends|import|from|as|export|default|public|private|protected|static|interface|type|def|with|yield|lambda|echo|use|namespace|true|false|null|undefined|True|False|None|and|or|not|in)\b|\b\d+(?:\.\d+)?\b/g,
      classify: (m) => (m[1] ? 'cmt' : m[2] ? 'str' : m[3] ? 'key' : m[4] ? 'kw' : 'num'),
    },
  });

  const LANGUAGE_GRAMMAR = Object.freeze({
    json: 'json',
    bash: 'shell',
    powershell: 'shell',
    sql: 'sql',
    yaml: 'yaml',
    html: 'html',
    css: 'css',
  });

  function wrapSyntaxToken(type, rawText) {
    const color = SYNTAX_HEX[type];
    const escaped = escapeHtml(rawText);
    return color ? `<span style="color: ${color};">${escaped}</span>` : escaped;
  }

  function tokenize(source, grammar) {
    const re = grammar.re;
    let result = '';
    let lastIdx = 0;
    let m;
    re.lastIndex = 0;

    while ((m = re.exec(source)) !== null) {
      if (m.index > lastIdx) result += escapeHtml(source.slice(lastIdx, m.index));
      const tokenType = grammar.classify(m);
      result += tokenType ? wrapSyntaxToken(tokenType, m[0]) : escapeHtml(m[0]);
      lastIdx = re.lastIndex;
      if (m[0].length === 0) re.lastIndex++;
    }

    if (lastIdx < source.length) result += escapeHtml(source.slice(lastIdx));
    return result;
  }

  /**
   * Highlights `rawCode` for the given language id. Unknown languages fall back
   * to the C-like script grammar, `plain` is only escaped.
   * @param {string} rawCode
   * @param {string} langId
   * @returns {string} HTML
   */
  function highlightCodeToHtml(rawCode, langId) {
    const normalized = String(rawCode || '').replace(/\r\n?/g, '\n');
    const lang = String(langId || 'plain').toLowerCase();
    if (!normalized || lang === 'plain') return escapeHtml(normalized);
    return tokenize(normalized, GRAMMARS[LANGUAGE_GRAMMAR[lang] || 'script']);
  }

  /**
   * Builds the complete code block: optional `[Language]` caption, highlighted
   * code and an empty line after it so the caret can leave the block.
   */
  function buildCodeBlockHtml(rawCode, langId) {
    const langObj =
      CODE_LANGUAGES.find((l) => l.id === String(langId || '').toLowerCase()) ||
      CODE_LANGUAGES[CODE_LANGUAGES.length - 1];
    const codeText = String(rawCode || '').replace(/\r\n?/g, '\n');
    const highlighted = highlightCodeToHtml(codeText, langObj.id);
    const headerLine = langObj.id !== 'plain' ? `<strong>[${escapeHtml(langObj.label)}]</strong>\n` : '';
    return `<pre><code>${headerLine}${highlighted || '<br>'}</code></pre><div><br></div>`;
  }

  const api = { SYNTAX_HEX, CODE_LANGUAGES, highlightCodeToHtml, buildCodeBlockHtml };

  editor.codeHighlight = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
