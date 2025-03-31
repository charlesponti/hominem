/**
 * Extracts a numeric value from a string.
 *
 * @param input - The string from which to extract the numeric value
 * @returns The extracted numeric value as a number, or null if no numeric value is found
 *
 * @example
 * extractNumericValue('The price is 123') -> 123
 *
 * @example
 * extractNumericValue('The price is 123.45') -> 123.45
 *
 * @example
 * extractNumericValue('No numbers here') -> null
 */
export function extractNumericValue(input: string): number | null {
  const matches = input.match(/\d+(\.\d+)?/)
  return matches ? Number.parseFloat(matches[0]) : null
}
