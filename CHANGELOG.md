# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] – 2026-11-23

First public release for Chrome, Edge and Firefox.

### Formatting toolbar

- Works directly on Zammad's reply editor: text modules, mentions, uploads, undo history and signatures keep
  working.
- Bold, italic, underline, strikethrough, quotes, dividers, clear formatting, nested bulleted and numbered lists
  (`Tab` / `Shift+Tab`).
- Inline code (`Ctrl+Shift+C`) and code blocks with syntax highlighting for Bash, PowerShell, JSON, SQL,
  JavaScript/TypeScript, Python, YAML, HTML/XML, PHP and CSS.
- Links (`Ctrl+K`) with URL validation, tables with a 6×6 picker, emoji picker with English and German search.
- Detects public replies and internal notes; internal notes get four highlight marker colors.
- Popovers can be moved by their title bar and remember their position.

### Email preview and Format Guard

- Email preview on a white background (`Esc` returns to the editor) to spot unreadable colors before sending.
- Paste cleanup removes hidden dark-mode, Outlook and Word colors, backgrounds and fonts while keeping the
  structure.
- X-ray outline of remaining hidden formatting with one-click cleanup; warns when highlight markers end up in a
  public reply.

### Advanced ticket search

- Search builder that writes Zammad / Elasticsearch syntax: customer names, email addresses and domains, time
  ranges, states, From/To/CC, owner, ticket number, group, tags and excluded words.
- Live syntax view, saved presets and a local history of the last 12 searches.

### Popup

- Settings and Zammad instances in English and German, following the browser's light / dark color scheme.
- Each Zammad instance is granted individually at runtime (`optional_host_permissions`).

### Privacy and security

- No analytics, no tracking, no network requests; settings stay in the browser. See [PRIVACY.md](PRIVACY.md).
- Permissions: `storage`, `scripting`, `activeTab` and the hosts you add yourself.
- All markup is parsed in an inert document (`DOMParser`) and limited to what Zammad's server-side sanitizer
  keeps; links are restricted to `https:`, `http:`, `mailto:`, `tel:` and relative targets.

[1.0.0]: https://github.com/drw1337/Zammad-Buddy/releases/tag/v1.0.0
