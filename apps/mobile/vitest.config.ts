import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsConfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    slowTestThreshold: 250,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    alias: {
      '@react-native-community/datetimepicker': new URL(
        './tests/__mocks__/datetimepicker.tsx',
        import.meta.url,
      ).pathname,
      'expo-image': new URL('./tests/__mocks__/expo-image.tsx', import.meta.url).pathname,
      'expo-router': new URL('./tests/__mocks__/expo-router.tsx', import.meta.url).pathname,
      'react-native-safe-area-context': new URL(
        './tests/__mocks__/react-native-safe-area-context.tsx',
        import.meta.url,
      ).pathname,
      '~/components/focus/note-editing-sheet': new URL(
        './tests/__mocks__/note-editing-sheet.tsx',
        import.meta.url,
      ).pathname,
      '~/lib/posthog': new URL('./tests/__mocks__/posthog.ts', import.meta.url).pathname,
      '~/utils/services/notes/use-update-focus': new URL(
        './tests/__mocks__/use-update-focus.ts',
        import.meta.url,
      ).pathname,
      'react-native': new URL('./tests/__mocks__/react-native.ts', import.meta.url).pathname,
    },
  },
})
