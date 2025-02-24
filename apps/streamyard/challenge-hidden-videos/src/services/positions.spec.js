import { getPositions } from './positions'
import { describe, test, expect } from 'vitest'

describe('getPositions', () => {
  test('streams are positioned side by side', () => {
    const streams = {
      1: { isVideoOn: true },
      2: { isVideoOn: true },
      3: { isVideoOn: true },
      4: { isVideoOn: true },
    }

    expect(getPositions(streams)).toEqual({
      1: { width: 25, height: 100, x: 0, y: 0 },
      2: { width: 25, height: 100, x: 25, y: 0 },
      3: { width: 25, height: 100, x: 50, y: 0 },
      4: { width: 25, height: 100, x: 75, y: 0 },
    })
  })

  test('streams without video are hidden', () => {
    const streams = {
      1: { isVideoOn: true },
      2: { isVideoOn: false },
      3: { isVideoOn: true },
    }

    expect(getPositions(streams)).toEqual({
      1: { width: 50, height: 100, x: 0, y: 0 },
      2: { width: 0, height: 0, x: 0, y: 0 },
      3: { width: 50, height: 100, x: 50, y: 0 },
    })
  })
})
