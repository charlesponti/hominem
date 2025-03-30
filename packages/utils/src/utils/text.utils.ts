// Function to extract numeric values from text input
/**
 * Extracts a numeric value from a string.
 *
 * @param input - The string from which to extract the numeric value
 * @returns The extracted numeric value as a number, or null if no numeric value is found
 *
 * @example
 * // returns 123
 * extractNumericValue('The price is 123')
 *
 * @example
 * // returns 123.45
 * extractNumericValue('The price is 123.45')
 *
 * @example
 * // returns null
 * extractNumericValue('No numbers here')
 */
export function extractNumericValue(input: string): number | null {
  const matches = input.match(/\d+(\.\d+)?/)
  return matches ? Number.parseFloat(matches[0]) : null
}
