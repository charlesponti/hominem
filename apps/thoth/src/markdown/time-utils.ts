// Simple date extraction from text
export function getDatesFromText(text: string): { dates: { start: string; end?: string }[]; fullDate?: string } {
  const dates: { start: string; end?: string }[] = []

  // ISO date regex (YYYY-MM-DD or YYYY/MM/DD)
  const isoDateRegex = /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g
  const isoMatches = [...text.matchAll(isoDateRegex)]
  
  isoMatches.forEach((match) => {
    const dateStr = match[1].replace(/\//g, '-')
    const [year, month, day] = dateStr.split('-')
    
    // Ensure month and day are two digits
    const paddedMonth = month.padStart(2, '0')
    const paddedDay = day.padStart(2, '0')
    
    const formattedDate = `${year}-${paddedMonth}-${paddedDay}T00:00:00`
    dates.push({ start: formattedDate })
  })

  // Month day, year format (e.g., January 1, 2022)
  const monthDayYearRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi
  const monthDayMatches = [...text.matchAll(monthDayYearRegex)]
  
  monthDayMatches.forEach((match) => {
    const month = new Date(`${match[1]} 1, 2000`).getMonth() + 1
    const day = parseInt(match[2], 10)
    const year = parseInt(match[3], 10)
    
    const paddedMonth = month.toString().padStart(2, '0')
    const paddedDay = day.toString().padStart(2, '0')
    
    const formattedDate = `${year}-${paddedMonth}-${paddedDay}T00:00:00`
    dates.push({ start: formattedDate })
  })

  // Extract full date from text if possible
  let fullDate: string | undefined
  if (dates.length > 0) {
    fullDate = dates[0].start.split('T')[0]
  }

  return { dates, fullDate }
}