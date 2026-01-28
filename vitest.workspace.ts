import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default [
  // Resolve paths relative to this file so they are absolute when Vitest runs from package directories
  path.join(__dirname, 'apps/finance/vitest.config.ts'),
  path.join(__dirname, 'apps/notes/vitest.config.ts'),
  path.join(__dirname, 'apps/rocco/vitest.config.ts'),
  path.join(__dirname, 'packages/ui/vitest.config.ts'),
  path.join(__dirname, 'packages/utils/vitest.config.mts'),
  path.join(__dirname, 'services/api/vitest.config.mts'),
  path.join(__dirname, 'services/workers/vitest.config.ts'),
  path.join(__dirname, 'tools/cli/vitest.config.mts'),
];
