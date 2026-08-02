// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // ── ignores ─────────────────────────────────────────────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      'packages/shared/dist/**',
      '**/next-env.d.ts',
      'apps/backend/src/generated/**',
    ],
  },

  eslint.configs.recommended,

  // ── TypeScript con type-checking ─────────────────────────────────────────────
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.ts'],
    // prisma.config.ts y prisma/seed.ts viven fuera del rootDir ("./src") del
    // tsconfig del backend; se lintean aparte, sin type-checking, más abajo.
    ignores: ['apps/backend/prisma.config.ts', 'apps/backend/prisma/seed.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Allow void-returning callbacks in Express middleware (next(), res.json(), etc.)
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false } },
      ],
    },
  },

  // ── prisma.config.ts / prisma/seed.ts: TS sin type-checking (fuera del rootDir del tsconfig) ──
  {
    files: ['apps/backend/prisma.config.ts', 'apps/backend/prisma/seed.ts'],
    extends: [...tseslint.configs.recommended],
  },

  // ── Frontend: reglas de Next.js ──────────────────────────────────────────────
  {
    files: ['apps/frontend/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    settings: {
      next: { rootDir: 'apps/frontend' },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // ── Prettier al final (desactiva reglas de formato que conflictúan) ──────────
  prettierConfig,
);
