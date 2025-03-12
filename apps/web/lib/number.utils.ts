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
