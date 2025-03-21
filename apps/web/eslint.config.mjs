import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['components/ui/*'],
  },
  {
    rules: {
      // Handled by Biome
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]

export default eslintConfig
