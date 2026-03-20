import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('desktop radius audit', () => {
  it('uses shared web design-system radius tokens only', () => {
    const source = readFileSync(join(process.cwd(), 'src/renderer/src/globals.css'), 'utf8')

    expect(source).not.toMatch(/--radius-(sm|md|lg|xl):/)
    expect(source).not.toMatch(/@apply rounded-(sm|lg|xl)\b/)
  })
})
