import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  './apps/api/vitest.config.mts',
  './apps/chat/vitest.config.mts',
  './apps/cli/vitest.config.mts',
  './apps/florin/vitest.config.ts',
  './packages/utils/vitest.config.mts',
])
