// Helper function to adjust date range to ensure full month is included
export function adjustDateRange(
  dateFrom?: Date,
  dateTo?: Date
): { adjustedDateFrom?: Date; adjustedDateTo?: Date } {
  if (!dateFrom || !dateTo) {
    return { adjustedDateFrom: dateFrom, adjustedDateTo: dateTo }
  }

  const now = new Date()
  const isCurrentMonth =
    dateTo.getMonth() === now.getMonth() && dateTo.getFullYear() === now.getFullYear()

  let adjustedDateTo = dateTo

  // If dateTo is in the current month, extend it to the end of the month
  if (isCurrentMonth) {
    adjustedDateTo = new Date(dateTo.getFullYear(), dateTo.getMonth() + 1, 0) // Last day of the month
  }

  return { adjustedDateFrom: dateFrom, adjustedDateTo }
}

// Helper function to format date based on whether it's this year
export function formatChartDate(dateString: string): string {
  // Parse YYYY-MM format explicitly to avoid timezone issues
  const [yearStr, monthStr] = dateString.split('-')
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10) - 1 // JavaScript months are 0-indexed

  const currentYear = new Date().getFullYear()

  if (year === currentYear) {
    // This year - show month name only
    const date = new Date(year, month, 1)
    return date.toLocaleDateString('en-US', { month: 'short' })
  }

  // Other years - show month and year like "Dec '24"
  const date = new Date(year, month, 1)
  const monthName = date.toLocaleDateString('en-US', { month: 'short' })
  const yearShort = year.toString().slice(-2) // Get last 2 digits
  return `${monthName} '${yearShort}`
}
