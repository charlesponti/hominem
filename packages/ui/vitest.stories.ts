import tailwindcss from '@tailwindcss/vite'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    storybookTest({ storybookUrl: 'http://localhost:6006' }),
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
