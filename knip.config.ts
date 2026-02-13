export default {
  workspaces: {
    'apps/*': {
      entry: [
        'app/**/*.{ts,tsx}',
        'scripts/**/*.{ts,tsx}',
        'tests/**/*.{ts,tsx}',
        '*.config.{ts,js,mjs,cjs}',
        'react-router.config.ts',
        'vitest.config.ts',
        'vitest.setup.ts',
        'playwright.config.ts',
        'postcss.config.{ts,js,mjs,cjs}',
        'tailwind.config.{ts,js,mjs,cjs}',
        'vite.config.ts'
      ],
      project: ['tsconfig.json']
    },
    'packages/*': {
      entry: [
        'src/**/*.{ts,tsx}',
        'tests/**/*.{ts,tsx}',
        '*.config.{ts,js,mjs,cjs}',
        'vitest.config.ts',
        'vitest.setup.ts',
        'postcss.config.{ts,js,mjs,cjs}',
        'tailwind.config.{ts,js,mjs,cjs}',
        'vite.config.ts'
      ],
      project: ['tsconfig.json']
    },
    'services/*': {
      entry: [
        'src/**/*.{ts,tsx}',
        'tests/**/*.{ts,tsx}',
        '*.config.{ts,js,mjs,cjs}',
        'vitest.config.ts',
        'vitest.setup.ts',
        'postcss.config.{ts,js,mjs,cjs}',
        'tailwind.config.{ts,js,mjs,cjs}',
        'vite.config.ts'
      ],
      project: ['tsconfig.json']
    },
    'tools/*': {
      entry: [
        'src/**/*.{ts,tsx}',
        'tests/**/*.{ts,tsx}',
        '*.ts',
        '*.mts',
        '*.config.{ts,js,mjs,cjs}',
        'vitest.config.ts',
        'vitest.setup.ts'
      ],
      project: ['tsconfig.json']
    }
  },
  ignore: [
    '**/build/**',
    '**/dist/**',
    '**/.turbo/**',
    '**/.cache/**',
    '**/coverage/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/test-assets/**'
  ]
}
