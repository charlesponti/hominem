export function parseInboxTimestamp(value: string | Date): Date {
  if (!(value instanceof Date) && typeof value !== 'string') {
    throw new Error(`Invalid inbox item timestamp: ${String(value)}`)
  }

  const normalizedInput = value instanceof Date ? value.toISOString() : value
  const trimmed = normalizedInput.trim()
  if (!trimmed) {
    throw new Error('Invalid inbox item timestamp: empty string')
  }

  let normalized = trimmed.replace(' ', 'T')

  normalized = normalized.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00')

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid inbox item timestamp: ${value}`)
  }

  return date
}
