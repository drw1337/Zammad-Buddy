# Contributing

Thanks for your interest! This is a personal project; pull requests are welcome as suggestions and are reviewed
one by one. For larger changes, please open an issue or discussion first.

## Setup

```bash
npm install
npm run check   # lint, formatting, tests, Firefox add-on linter
```

Load `dist/chrome` or `dist/firefox` as an unpacked extension (see the README), or open
`test/mock-zammad.html` for the offline sandbox.

## Ground rules

- **No runtime dependencies.** The extension ships plain JavaScript and CSS only.
- **Never replace Zammad's editor.** Work on `[data-name="body"][contenteditable="true"]` directly. Text
  modules, mentions, uploads, undo history and the signature block (`div[data-signature="true"]`) must keep working.
- **Only Zammad-safe markup.** Generated HTML must survive Zammad's server-side sanitizer.
- **Light-DOM inputs.** In-page forms use real inputs with event shielding, no Shadow DOM on inputs.
- **Both languages.** Every user-facing text goes into `core/locales/` in English and German. A test checks parity.
- **No real customer data.** Use neutral examples (`example.com`, `Jane Doe`) in code, tests, docs and screenshots.
- **Tests.** Add or update tests in `test/` for every behavior change. Tests run offline; never against a live Zammad.

## Adding a content script

Content scripts are loaded in the order of `CONTENT_JS` in `background.js`. Add new files there and in
`test/mock-zammad.html`; `test/load-order.test.js` fails if the two lists differ.

## Screenshots

`docs/screenshots/` holds screenshots of a real Zammad instance taken with neutral test data. Crop away
the address bar and replace or remove anything that identifies an instance, customer or agent (host names,
ticket numbers, names, avatars) before adding a picture.

## Zammad DOM

Every selector that depends on Zammad's markup belongs in `core/zammad-dom.js`, so an interface change in Zammad
needs an update in one place.

## Style

ESLint and Prettier enforce the code style (`npm run lint`, `npm run format`). Comments are in English and
explain why, not what.
