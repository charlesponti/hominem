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
