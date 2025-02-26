import { describe, expect, test } from 'vitest'
import { getDateFromText } from './utils'

describe('getDateFromText', () => {
  test('extracts full date in YYYY-MM-DD format', () => {
    expect(getDateFromText('Document created on 2023-05-15')).toEqual({
      fullDate: '2023-05-15',
      year: '2023',
    })
  })

  test('extracts only year when no full date is present', () => {
    expect(getDateFromText('Published in 2023')).toEqual({
      fullDate: undefined,
      year: '2023',
    })
  })

  test('handles multiple dates and returns the first occurrence', () => {
    expect(getDateFromText('Created on 2023-01-01, updated on 2023-12-31')).toEqual({
      fullDate: '2023-01-01',
      year: '2023',
    })
  })

  test('returns undefined for both properties when no date is found', () => {
    expect(getDateFromText('No date information here')).toEqual({
      fullDate: undefined,
      year: undefined,
    })
  })

  test('handles dates within other numbers', () => {
    expect(getDateFromText('Reference: 123 2023 456')).toEqual({
      fullDate: undefined,
      year: '2023',
    })
  })

  test('handles text with special characters', () => {
    expect(getDateFromText('Date: 2023-05-15! (important)')).toEqual({
      fullDate: '2023-05-15',
      year: '2023',
    })
  })

  test('ignores years that are part of larger numbers', () => {
    expect(getDateFromText('Number: 12023 or 20235')).toEqual({
      fullDate: undefined,
      year: undefined,
    })
  })

  test('handles dates at the beginning of text', () => {
    expect(getDateFromText('2023-05-15 is the date')).toEqual({
      fullDate: '2023-05-15',
      year: '2023',
    })
  })

  test('handles dates at the end of text', () => {
    expect(getDateFromText('The date is 2023-05-15')).toEqual({
      fullDate: '2023-05-15',
      year: '2023',
    })
  })
})
