import { describe, expect, test } from 'vitest'
import { TIME_UNITS, getDaysBetweenDates, getNumberOfDays } from './time'

describe('TIME_UNITS', () => {
  test('should have correct millisecond values', () => {
    expect(TIME_UNITS.SECOND).toBe(1000)
    expect(TIME_UNITS.MINUTE).toBe(60 * 1000)
    expect(TIME_UNITS.HOUR).toBe(60 * 60 * 1000)
    expect(TIME_UNITS.DAY).toBe(24 * 60 * 60 * 1000)
    expect(TIME_UNITS.WEEK).toBe(7 * 24 * 60 * 60 * 1000)
    expect(TIME_UNITS.MONTH).toBe(30 * 24 * 60 * 60 * 1000)
    expect(TIME_UNITS.YEAR).toBe(365 * 24 * 60 * 60 * 1000)
  })
})

describe('getNumberOfDays', () => {
  test('should convert milliseconds to days', () => {
    expect(getNumberOfDays(TIME_UNITS.DAY)).toBe(1)
    expect(getNumberOfDays(TIME_UNITS.WEEK)).toBe(7)
    expect(getNumberOfDays(2 * TIME_UNITS.DAY)).toBe(2)
  })

  test('should handle negative values', () => {
    expect(getNumberOfDays(-TIME_UNITS.DAY)).toBe(1)
    expect(getNumberOfDays(-TIME_UNITS.WEEK)).toBe(7)
  })

  test('should handle zero', () => {
    expect(getNumberOfDays(0)).toBe(0)
  })

  test('should handle fractional days', () => {
    expect(getNumberOfDays(TIME_UNITS.HOUR * 12)).toBe(0.5)
  })
})

describe('getDaysBetweenDates', () => {
  test('should calculate days between two dates', () => {
    const date1 = new Date('2023-01-01')
    const date2 = new Date('2023-01-02')
    expect(getDaysBetweenDates(date1, date2)).toBe(1)
  })

  test('should handle dates in reverse order', () => {
    const date1 = new Date('2023-01-02')
    const date2 = new Date('2023-01-01')
    expect(getDaysBetweenDates(date1, date2)).toBe(1)
  })

  test('should handle same date', () => {
    const date = new Date('2023-01-01')
    expect(getDaysBetweenDates(date, date)).toBe(0)
  })

  test('should handle dates across months', () => {
    const date1 = new Date('2023-01-31')
    const date2 = new Date('2023-02-01')
    expect(getDaysBetweenDates(date1, date2)).toBe(1)
  })

  test('should handle dates across years', () => {
    const date1 = new Date('2022-12-31')
    const date2 = new Date('2023-01-01')
    expect(getDaysBetweenDates(date1, date2)).toBe(1)
  })

  test('should handle fractional days', () => {
    const date1 = new Date('2023-01-01T00:00:00')
    const date2 = new Date('2023-01-01T12:00:00')
    expect(getDaysBetweenDates(date1, date2)).toBe(0.5)
  })
})
