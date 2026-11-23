/**
 * Minimal, dependency-free HTML DOM parser for the Node.js unit tests (`node --test`).
 * Implements exactly the DOM operations the sanitizer and editor commands use.
 */
'use strict';

const VOID_TAGS = new Set(['BR', 'HR', 'IMG', 'META', 'LINK', 'COL', 'INPUT']);

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/gi, '\u00a0')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function encodeText(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function encodeAttr(str) {
  return encodeText(str).replace(/"/g, '&quot;');
}

class MiniNode {
  constructor(nodeType, ownerDocument) {
    this.nodeType = nodeType;
    this.ownerDocument = ownerDocument || null;
    this.parentNode = null;
    this.childNodes = [];
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] || null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx >= 0 && idx + 1 < this.parentNode.childNodes.length
      ? this.parentNode.childNodes[idx + 1]
      : null;
  }

  get previousSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx > 0 ? this.parentNode.childNodes[idx - 1] : null;
  }

  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  insertBefore(newNode, refNode) {
    if (!refNode) return this.appendChild(newNode);
    const idx = this.childNodes.indexOf(refNode);
    if (idx === -1) throw new Error('Reference node not found');
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    newNode.parentNode = this;
    this.childNodes.splice(idx, 0, newNode);
    return newNode;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx === -1) throw new Error('Child not found');
    this.childNodes.splice(idx, 1);
    child.parentNode = null;
    return child;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.childNodes.indexOf(oldChild);
    if (idx === -1) throw new Error('Old child not found');
    if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
    newChild.parentNode = this;
    oldChild.parentNode = null;
    this.childNodes[idx] = newChild;
    return oldChild;
  }
}

class MiniText extends MiniNode {
  constructor(data, doc) {
    super(3, doc);
    this.data = data;
  }
  get textContent() {
    return this.data;
  }
  outerHTML() {
    return encodeText(this.data);
  }
}

class MiniComment extends MiniNode {
  constructor(data, doc) {
    super(8, doc);
    this.data = data;
  }
  get textContent() {
    return '';
  }
  outerHTML() {
    return `<!--${this.data}-->`;
  }
}

class MiniElement extends MiniNode {
  constructor(tagName, doc) {
    super(1, doc);
    this.tagName = tagName.toUpperCase();
    this._attrs = new Map();
    const self = this;
    this.classList = {
      contains(cls) {
        const raw = self.getAttribute('class') || '';
        return raw.split(/\s+/).filter(Boolean).includes(cls);
      },
    };
  }

  get attributes() {
    return Array.from(this._attrs.entries()).map(([name, value]) => ({ name, value }));
  }

  get children() {
    return this.childNodes.filter((n) => n.nodeType === 1);
  }

  get firstElementChild() {
    return this.children[0] || null;
  }

  hasAttribute(name) {
    return this._attrs.has(name.toLowerCase());
  }

  getAttribute(name) {
    const key = name.toLowerCase();
    return this._attrs.has(key) ? this._attrs.get(key) : null;
  }

  setAttribute(name, value) {
    this._attrs.set(name.toLowerCase(), String(value));
  }

  removeAttribute(name) {
    this._attrs.delete(name.toLowerCase());
  }

  get textContent() {
    return this.childNodes.map((c) => c.textContent).join('');
  }

  get innerHTML() {
    return this.childNodes.map((c) => c.outerHTML()).join('');
  }

  set innerHTML(html) {
    this.childNodes = [];
    parseHtmlInto(html, this, this.ownerDocument);
  }

  outerHTML() {
    const lowerTag = this.tagName.toLowerCase();
    let attrStr = '';
    for (const [k, v] of this._attrs.entries()) {
      attrStr += ` ${k}="${encodeAttr(v)}"`;
    }
    if (VOID_TAGS.has(this.tagName)) {
      return `<${lowerTag}${attrStr}>`;
    }
    return `<${lowerTag}${attrStr}>${this.innerHTML}</${lowerTag}>`;
  }

  querySelector(selectorList) {
    const tags = selectorList
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    function find(el) {
      for (const ch of el.children) {
        if (tags.includes(ch.tagName)) return ch;
        const hit = find(ch);
        if (hit) return hit;
      }
      return null;
    }
    return find(this);
  }
}

class MiniDocument {
  constructor() {
    this.body = new MiniElement('BODY', this);
  }
  createElement(tag) {
    return new MiniElement(tag, this);
  }
  createTextNode(text) {
    return new MiniText(text, this);
  }
}

function parseAttributes(attrText, el) {
  const re = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(attrText)) !== null) {
    const name = m[1];
    const val = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    el.setAttribute(name, decodeEntities(val));
  }
}

function parseHtmlInto(html, rootEl, doc) {
  const stack = [rootEl];
  const tokenRe = /<!--([\s\S]*?)-->|<\/([a-zA-Z0-9_:-]+)\s*>|<([a-zA-Z0-9_:-]+)([^>]*?)(\/?)>/g;
  let lastIndex = 0;
  let m;

  while ((m = tokenRe.exec(html)) !== null) {
    if (m.index > lastIndex) {
      const txt = decodeEntities(html.slice(lastIndex, m.index));
      stack[stack.length - 1].appendChild(new MiniText(txt, doc));
    }
    lastIndex = tokenRe.lastIndex;

    if (m[1] !== undefined) {
      stack[stack.length - 1].appendChild(new MiniComment(m[1], doc));
    } else if (m[2] !== undefined) {
      const closeTag = m[2].toUpperCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === closeTag) {
          stack.length = i;
          break;
        }
      }
    } else if (m[3] !== undefined) {
      const openTag = m[3].toUpperCase();
      const attrs = m[4] || '';
      const selfClosing = m[5] === '/' || VOID_TAGS.has(openTag);

      // <style> / <script>: take raw text up to the closing tag
      if ((openTag === 'STYLE' || openTag === 'SCRIPT') && !selfClosing) {
        const el = new MiniElement(openTag, doc);
        parseAttributes(attrs, el);
        stack[stack.length - 1].appendChild(el);
        const closeRe = new RegExp(`<\\/${openTag}\\s*>`, 'ig');
        closeRe.lastIndex = tokenRe.lastIndex;
        const closeMatch = closeRe.exec(html);
        if (closeMatch) {
          el.appendChild(new MiniText(html.slice(tokenRe.lastIndex, closeMatch.index), doc));
          tokenRe.lastIndex = closeRe.lastIndex;
          lastIndex = tokenRe.lastIndex;
        }
        continue;
      }

      const el = new MiniElement(openTag, doc);
      parseAttributes(attrs, el);
      stack[stack.length - 1].appendChild(el);
      if (!selfClosing) {
        stack.push(el);
      }
    }
  }

  if (lastIndex < html.length) {
    const txt = decodeEntities(html.slice(lastIndex));
    stack[stack.length - 1].appendChild(new MiniText(txt, doc));
  }
}

class MiniDOMParser {
  parseFromString(html) {
    const doc = new MiniDocument();
    // For a full <html>…<body>…</body></html> document keep only <body>
    const bodyMatch = String(html).match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const content = bodyMatch ? bodyMatch[1] : String(html);
    parseHtmlInto(content, doc.body, doc);
    return doc;
  }
}

module.exports = { MiniDOMParser, MiniDocument };
