export const getTimezone = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return timezone
}

export const getLocalDate = (date: Date) => {
  const timeZone = getTimezone()

  const offset = new Date().getTimezoneOffset()
  const dateWithOffset = new Date(date.getTime() + offset * 60 * 1000)
  const localDate = new Date(
    dateWithOffset.getTime() - dateWithOffset.getTimezoneOffset() * 60 * 1000 * 2
  )

  // Ensure the date is treated in the user's timezone
  const localDateString = localDate.toLocaleString(undefined, {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })

  return { localDateString, localDate }
}
