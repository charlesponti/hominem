import { twoSum } from './two-sum'
import { describe, test, expect } from 'vitest'

describe('twoSum', () => {
  test('should find indexes of addends', () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1])
  })
})
