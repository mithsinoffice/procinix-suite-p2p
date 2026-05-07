import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────────────────────
  {
    ignores: [
      'build/**',
      'node_modules/**',
      'docs/legacy/**',
      'sql/**',
      '**/*.min.js',
      'coverage/**',
    ],
  },

  // ── TypeScript frontend (src/**/*.{ts,tsx}) ──────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactPlugin.configs.flat.recommended,
    ],
    plugins: {
      // react-hooks registered manually — NOT via configs preset, because react-hooks v7
      // ships 13 aggressive new React-compiler rules as errors. We only want the two
      // classic rules for now; ratchet the rest up under task F4 / a dedicated task.
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // ── React ───────────────────────────────────────────────────────────────
      'react/prop-types': 'off', // TS handles prop types
      'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
      'react/display-name': 'off', // many HOC patterns don't need it
      // Pre-existing: 45 instances of unescaped " and ' in JSX text — downgrade, fix under F4
      'react/no-unescaped-entities': 'warn',

      // ── React Refresh ────────────────────────────────────────────────────────
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ── React Hooks — classic two rules only ─────────────────────────────────
      // Pre-existing: 3 hooks-in-non-component violations — downgrade, fix under F4
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',

      // ── TypeScript — downgrade noisy rules to warn for now (ratchet F4) ──────
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      // Pre-existing unused expression (e.g. standalone expression statements) — fix under F4
      '@typescript-eslint/no-unused-expressions': 'warn',

      // ── General — pre-existing violations in untouched files (fix under F4) ──
      'no-empty-pattern': 'off',
      'no-console': 'off',
      // prefer-const: 6 pre-existing let→const violations
      'prefer-const': 'warn',
      // no-useless-assignment: 8 pre-existing dead assignments
      'no-useless-assignment': 'warn',
      // no-case-declarations: 2 pre-existing lexical decls in case blocks
      'no-case-declarations': 'warn',

      // ── Prettier — disable conflicting stylistic rules ───────────────────────
      ...prettier.rules,
    },
  },

  // ── Server Node.js (server/**/*.mjs — plain ESM, no TypeScript rules) ─────
  {
    files: ['server/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-undef': 'warn', // downgrade — Node globals covered by globals.node; warn not error
      // Pre-existing dead assignments in server files — fix under F4
      'no-useless-assignment': 'warn',
      ...prettier.rules,
    },
  }
);
