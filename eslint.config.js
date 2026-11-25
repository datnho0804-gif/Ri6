import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'dev-dist', 'legacy', 'node_modules'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/sw.ts', 'src/sw/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-alert': 'error',
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/sw.ts', 'src/sw/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.serviceworker,
    },
    rules: {
      'no-alert': 'error',
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage'],
    },
  },
  {
    files: ['src/lib/sync/**/*.ts', 'src/db/syncStore.ts', 'src/db/database.ts', 'src/db/seed.ts'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage'],
    },
  }
);
