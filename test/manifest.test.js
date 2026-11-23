'use strict';

/** Release hygiene: manifest, package metadata and the build output agree. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

test('manifest and package.json share name, version and author', () => {
  const manifest = readJson('manifest.json');
  const pkg = readJson('package.json');
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'Buddy for Zammad');
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.author, pkg.author);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
});

test('manifest requests only the minimal permissions', () => {
  const manifest = readJson('manifest.json');
  assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'scripting', 'storage']);
  assert.equal(manifest.host_permissions, undefined, 'hosts are granted per instance at runtime');
  assert.equal(manifest.content_scripts, undefined, 'content scripts are registered dynamically');
});

test('every icon referenced by the manifest exists', () => {
  const manifest = readJson('manifest.json');
  const icons = [...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
  for (const rel of icons) assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
});

test('firefox metadata is ready for AMO signing', () => {
  const gecko = readJson('manifest.json').browser_specific_settings.gecko;
  assert.equal(
    gecko.id,
    'buddy-for-zammad@drw1337',
    'the ID must never change, or Firefox treats it as a new add-on'
  );
  assert.deepEqual(gecko.data_collection_permissions, { required: ['none'] });
});

test('the changelog documents the current version', () => {
  const { version } = readJson('manifest.json');
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const headings = changelog.split('\n').filter((line) => line.startsWith('## ['));
  assert.ok(
    headings.some((line) => line.startsWith(`## [${version}]`)),
    `CHANGELOG.md needs a section for ${version}`
  );
});
