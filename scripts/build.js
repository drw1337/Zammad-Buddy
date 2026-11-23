/**
 * Buddy for Zammad – Zero-Dependency Browser Package Builder (`node scripts/build.js`).
 *
 * Generates browser-specific MV3 directories without manifest warnings:
 * - `dist/chrome/`  -> uses only `background.service_worker` (0 warnings in Chrome/Edge/Brave)
 * - `dist/firefox/` -> uses only `background.scripts` + `browser_specific_settings.gecko`
 *
 * Author: drw1337
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const RUNTIME_ENTRIES = ['background.js', 'content.js', 'core', 'features', 'popup', 'icons'];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function buildTarget(targetName, transformManifest) {
  const outDir = path.join(DIST, targetName);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  for (const rel of RUNTIME_ENTRIES) {
    copyRecursive(path.join(ROOT, rel), path.join(outDir, rel));
  }

  const baseManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const targetManifest = transformManifest(baseManifest);
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    `${JSON.stringify(targetManifest, null, 2)}\n`,
    'utf8'
  );
  return outDir;
}

const chromeDir = buildTarget('chrome', (m) => {
  const copy = JSON.parse(JSON.stringify(m));
  delete copy.browser_specific_settings;
  copy.background = { service_worker: 'background.js' };
  return copy;
});

const firefoxDir = buildTarget('firefox', (m) => {
  const copy = JSON.parse(JSON.stringify(m));
  copy.background = { scripts: ['background.js'] };
  return copy;
});

console.log(
  `[Buddy for Zammad] Built warning-free packages:\n  Chrome:  ${chromeDir}\n  Firefox: ${firefoxDir}`
);
