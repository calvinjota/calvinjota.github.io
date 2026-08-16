/*
 * ESLint setup for the website.
 *
 * Mirrors the Android app config on purpose: both projects share calc.js,
 * clipboard.js, toast.js and price-sort.js byte for byte, so a rule that exists
 * on one side and not on the other would flag the same file differently
 * depending on which repository it is read from.
 *
 * The existing test suite proves the math but never follows a call across
 * module boundaries: a function left behind in one module while the caller
 * lives in another keeps the suite green. That gap is what this config closes,
 * so the rules that matter most are the ones about names that do not resolve.
 */

import js from '@eslint/js';
import globals from 'globals';
import importPlugin, { createNodeResolver } from 'eslint-plugin-import-x';

const nodeResolver = createNodeResolver();

/*
 * The site loads its modules straight from the browser, so every local import
 * carries the manual cache-busting query ('./calc.js?v=3') and Firebase arrives
 * as an absolute gstatic URL. Neither one is a path on disk, and the stock
 * resolver would report all of them as unresolved.
 *
 * Ignoring those specifiers instead would switch off the only check that
 * notices a file that moved or got renamed, which is exactly the risk of the
 * folder reorganisation still ahead. So the query is dropped and the real path
 * is resolved; a remote URL answers "found, nothing on disk to check".
 */
const cacheBustingResolver = {
  interfaceVersion: 3,
  name: 'cache-busting-node',
  resolve(modulePath, sourceFile) {
    if (/^https?:\/\//.test(modulePath)) {
      return { found: true, path: null };
    }
    return nodeResolver.resolve(modulePath.replace(/\?.*$/, ''), sourceFile);
  },
};

/*
 * Core ESLint stops at the file boundary: it flags a call to a name that exists
 * nowhere, but it never opens the neighbouring module to check that an imported
 * name is really exported there. These rules do open it, which is the whole
 * reason the plugin is here.
 *
 * import-x rather than the older eslint-plugin-import because that one declares
 * support only up to ESLint 9 and refuses to install next to the 10 used here.
 */
const crossModuleRules = {
  plugins: { 'import-x': importPlugin },
  settings: { 'import-x/resolver-next': [cacheBustingResolver] },
  rules: {
    'import-x/no-unresolved': 'error',
    'import-x/named': 'error',
    'import-x/export': 'error',
    'import-x/no-duplicates': 'error',
  },
};

const unusedVarsRule = [
  'error',
  {
    args: 'after-used',
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrors: 'all',
    caughtErrorsIgnorePattern: '^_',
  },
];

export default [
  {
    ignores: ['node_modules/**', 'assets/**'],
  },

  js.configs.recommended,

  {
    // ES modules loaded by the calculator page through <script type="module">.
    files: ['preco-lucro/calculadora/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: crossModuleRules.plugins,
    settings: crossModuleRules.settings,
    rules: {
      'no-unused-vars': unusedVarsRule,
      ...crossModuleRules.rules,
    },
  },

  {
    // Vitest suites: Node globals, and vitest itself is imported explicitly.
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: crossModuleRules.plugins,
    settings: crossModuleRules.settings,
    rules: {
      'no-unused-vars': unusedVarsRule,
      ...crossModuleRules.rules,
      // vitest and node: builtins are packages, not files on disk.
      'import-x/no-unresolved': ['error', { ignore: ['^vitest$', '^node:'] }],
    },
  },
];
