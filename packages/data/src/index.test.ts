import { describe, expect, it } from 'vitest'
import { users } from './db/schema'
import { db, takeOne, takeUniqueOrThrow } from './index'

describe('@hominem/data', () => {
  it('should export database utilities', () => {
    expect(db).toBeDefined()
    expect(takeOne).toBeDefined()
    expect(takeUniqueOrThrow).toBeDefined()
  })

  it('should export schemas', () => {
    expect(users).toBeDefined()
  })

  it('should handle takeOne utility', () => {
    expect(takeOne([1, 2, 3])).toBe(1)
    expect(takeOne([])).toBeUndefined()
  })

  it('should handle takeUniqueOrThrow utility', () => {
    expect(takeUniqueOrThrow([1])).toBe(1)
    expect(() => takeUniqueOrThrow([])).toThrow('No value found')
    expect(() => takeUniqueOrThrow([1, 2])).toThrow('Found multiple values')
  })
})
