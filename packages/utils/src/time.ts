export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
}

export function getDatesFromText(text: string) {
  const fullDate = text.match(/\d{4}-\d{2}-\d{2}/)
  const year = text.match(/(?<![\d.])\d{4}(?![\d.])/)

  // Parse basic date formats without chrono-node
  const parsedDates: Array<{ start: string; end?: string }> = []

  if (fullDate) {
    try {
      const date = new Date(fullDate[0])
      if (!Number.isNaN(date.getTime())) {
        parsedDates.push({
          start: date.toISOString(),
          end: undefined,
        })
      }
    } catch {
      // Ignore invalid dates
    }
  }

  return {
    dates: parsedDates,
    fullDate: fullDate?.[0],
    year: year?.[0],
  }
}

export const getNumberOfDays = (dateTimeNumber: number) => {
  return Math.abs(dateTimeNumber) / TIME_UNITS.DAY
}

export const getDaysBetweenDates = (startDate: Date, endDate: Date) => {
  return getNumberOfDays(endDate.getTime() - startDate.getTime())
}

export const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculates and formats the time difference between a given date and now.
 * Returns a human-readable string like "5 minutes ago", "2 hours ago", etc.
 *
 * @param date - The date to calculate the time difference from
 * @param fallback - Optional fallback text when date is null/undefined (default: "Unknown")
 * @returns A formatted string representing the time ago
 */
export function getTimeAgo(date: Date | string | null | undefined, fallback = 'Unknown'): string {
  if (!date) {
    return fallback
  }

  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - targetDate.getTime()
  const diffMins = Math.floor(diffMs / TIME_UNITS.MINUTE)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) {
    return 'Just now'
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}
