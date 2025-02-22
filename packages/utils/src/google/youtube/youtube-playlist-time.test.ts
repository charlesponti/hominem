import { calculateTotalTimeFromArray } from './youtube-playlist-time.ts'
import { describe, expect, test } from 'vitest'

describe('YouTube Playlist Time Calculator', () => {
  test('calculateTotalTimeFromArray', () => {
    const timestamps = [
      '32:40',
      '51:10',
      '41:23',
      '1:02:09',
      '30:55',
      '41:50',
      '1:22:05',
      '55:39',
      '2:44:17',
    ]
    const totalTime = calculateTotalTimeFromArray(timestamps)
    expect(totalTime).toEqual({
      days: 0,
      hours: 9,
      minutes: 22,
      seconds: 8,
    })
  })
})
