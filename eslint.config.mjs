import * as fs from 'fs';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginNext from '@next/eslint-plugin-next';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginQuery from '@tanstack/eslint-plugin-query';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

// Función para obtener directorios a ordenar
function getDirectoriesToSort() {
  const ignoredSortingDirectories = [
    '.git',
    '.next',
    '.vscode',
    'node_modules',
  ];
  return fs
    .readdirSync(process.cwd())
    .filter((file) => fs.statSync(process.cwd() + '/' + file).isDirectory())
    .filter((f) => !ignoredSortingDirectories.includes(f));
}

export default tseslint.config(
  {
    ignores: [
      '.git/',
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'out/**',
      'public/**',
      '*.min.js',
      '*.d.ts',
      '**/*.d.ts',
      '.vercel/**',
      'src/components/**/ui/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    extends: [
      'eslint:recommended',
      'next/core-web-vitals',
      'next/typescript',
      'plugin:@next/next/recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-type-checked',
      'plugin:@typescript-eslint/stylistic-type-checked',
      'plugin:import/recommended',
      'plugin:drizzle/recommended',
      'prettier',
    ],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@tanstack/query': pluginQuery,
      '@next/next': eslintPluginNext.configs,
      import: eslintPluginImport.configs,
    },
    rules: {
      // TypeScript rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-misused-promises': [
        'warn',
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-explicit-any': 'error',

      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/self-closing-comp': ['warn', { component: true, html: true }],

      // Import rules
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: [
            'external',
            'builtin',
            'internal',
            'sibling',
            'parent',
            'index',
          ],
          pathGroups: [
            ...getDirectoriesToSort().map((singleDir) => ({
              pattern: `${singleDir}/**`,
              group: 'internal',
            })),
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'next/**', group: 'external', position: 'before' },
            {
              pattern: '@/components/**',
              group: 'internal',
              position: 'after',
            },
            { pattern: '@/lib/**', group: 'internal', position: 'after' },
            { pattern: '@/styles/**', group: 'internal', position: 'after' },
            { pattern: 'public/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['react', 'internal'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'warn',
      'import/newline-after-import': 'warn',
      'import/no-unresolved': ['error', { commonjs: true }],
      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/export': 'error',

      // General rules
      'no-unused-expressions': 'error',
      'no-duplicate-imports': 'error',

      // Drizzle rules
      'drizzle/enforce-delete-with-where': [
        'warn',
        { drizzleObjectName: ['db', 'ctx.db'] },
      ],
      'drizzle/enforce-update-with-where': [
        'warn',
        { drizzleObjectName: ['db', 'ctx.db'] },
      ],

      // TanStack Query rules
      '@tanstack/query/exhaustive-deps': 'error',
      '@tanstack/query/no-rest-destructuring': 'warn',
      '@tanstack/query/stable-query-client': 'error',
      '@tanstack/query/no-unstable-deps': 'warn',
      '@tanstack/query/infinite-query-property-order': 'error',
      '@tanstack/query/no-void-query-fn': 'error',

      // Next.js specific rules
      '@next/next/google-font-display': 'error',
      '@next/next/no-img-element': 'error',
      '@next/next/no-html-link-for-pages': 'error',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
      'import/core-modules': [],
      'import/ignore': ['node_modules', '\\.(css|scss|sass|less|styl)$'],
      next: {
        rootDir: './',
      },
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  }
);
