'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['dist/**', 'node_modules/**', 'dev/**'] },
  js.configs.recommended,
  {
    // Extension code: classic browser scripts sharing the `ZammadBuddy` namespace.
    // The `module` / `require` checks only exist for the Node test runner.
    files: ['background.js', 'content.js', 'core/**/*.js', 'features/**/*.js', 'popup/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.webextensions, module: 'readonly', require: 'readonly' },
    },
  },
  {
    files: ['scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: globals.node },
  },
  {
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
];
