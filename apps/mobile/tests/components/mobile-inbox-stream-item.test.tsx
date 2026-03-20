import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('InboxStreamItem source contract', () => {
  it('uses a continuous row surface instead of a bordered card', () => {
    const source = readFileSync(`${root}/apps/mobile/components/workspace/inbox-stream-item.tsx`, 'utf8')

    expect(source).toContain('style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}')
    expect(source).not.toContain('styles.card')
    expect(source).not.toContain('borderWidth: 1')
    expect(source).not.toContain('borderRadius: t.borderRadii.md')
  })
})
