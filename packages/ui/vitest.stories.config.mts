import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    storybookTest({
      configDir: join(currentDir, '.storybook'),
      storybookUrl: 'http://localhost:6006',
    }),
  ],
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      name: 'chromium',
      provider: playwright,
      headless: true,
    },
  },
})