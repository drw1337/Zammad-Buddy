/**
 * Buddy for Zammad – Release packager (`npm run package`).
 *
 * Builds `dist/chrome` and `dist/firefox`, zips them with web-ext into
 * `dist/release/` and writes `SHA256SUMS.txt` for the GitHub release:
 * - `buddy-for-zammad-<version>-chrome.zip`  -> Chrome Web Store, Edge Add-ons
 * - `buddy-for-zammad-<version>-firefox.zip` -> addons.mozilla.org upload
 *
 * Author: drw1337
 */
'use strict';

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RELEASE = path.join(ROOT, 'dist', 'release');
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const WEB_EXT = path.join(ROOT, 'node_modules', 'web-ext', 'bin', 'web-ext.js');

execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
fs.rmSync(RELEASE, { recursive: true, force: true });

const files = [];
for (const target of ['chrome', 'firefox']) {
  const filename = `buddy-for-zammad-${version}-${target}.zip`;
  execFileSync(
    process.execPath,
    [
      WEB_EXT,
      'build',
      '--source-dir',
      path.join(ROOT, 'dist', target),
      '--artifacts-dir',
      RELEASE,
      '--filename',
      filename,
      '--overwrite-dest',
    ],
    { stdio: 'ignore' }
  );
  files.push(filename);
}

const sums = files.map((name) => {
  const hash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(RELEASE, name)))
    .digest('hex');
  return `${hash}  ${name}`;
});
fs.writeFileSync(path.join(RELEASE, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`, 'utf8');

console.log(`[Buddy for Zammad] Release ${version} packaged in ${RELEASE}:\n  ${sums.join('\n  ')}`);
