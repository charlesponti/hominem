/**
 * Formats a decimal number as a percentage string with one decimal place.
 * @param amount - The decimal value to format (e.g., 0.156 becomes "15.6%")
 * @returns A formatted percentage string
 */
export const formatPercent = (amount: number | string, fixed = 1): string => {
  const parsedAmount = Number.parseFloat(amount as string)

  if (Number.isNaN(parsedAmount)) {
    return '0.0%'
  }

  return `${(parsedAmount * 100).toFixed(fixed)}%`
}

/**
 * Helper function to format currency values consistently
 */
export const formatCurrency = (
  value: number | string | undefined | null,
  options?: Intl.NumberFormatOptions
): string => {
  const numericValue = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0)

  return numericValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD', // Default to USD, can be overridden by options
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true, // Ensures commas are used for thousands separators
    ...options,
  })
}
