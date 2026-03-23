import { formatDistance, formatDistanceToNow } from 'date-fns';

export function getTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getLocalDate(date: Date): { localDateString: string; localDate: Date } {
  const timeZone = getTimezone();

  const offset = new Date().getTimezoneOffset();
  const dateWithOffset = new Date(date.getTime() + offset * 60 * 1000);
  const localDate = new Date(
    dateWithOffset.getTime() - dateWithOffset.getTimezoneOffset() * 60 * 1000 * 2,
  );

  const localDateString = localDate.toLocaleString(undefined, {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return { localDateString, localDate };
}

export function parseInboxTimestamp(value: string | Date): Date {
  if (!(value instanceof Date) && typeof value !== 'string') {
    throw new Error(`Invalid inbox item timestamp: ${String(value)}`);
  }

  const normalizedInput = value instanceof Date ? value.toISOString() : value;
  const trimmed = normalizedInput.trim();
  if (!trimmed) {
    throw new Error('Invalid inbox item timestamp: empty string');
  }

  let normalized = trimmed.replace(' ', 'T');

  normalized = normalized.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid inbox item timestamp: ${value}`);
  }

  return date;
}

export function formatChatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  // Reset time to start of day for accurate comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffInMs = today.getTime() - chatDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Today';
  }
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  // Use formatDistance for relative dates (2+ days ago)
  return formatDistance(chatDate, today, { addSuffix: true });
}

/**
 * Formats a message timestamp using relative time (e.g., "2 minutes ago")
 */
export function formatMessageTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

export function adjustDateRange(
  dateFrom?: Date,
  dateTo?: Date,
): { adjustedDateFrom?: Date | undefined; adjustedDateTo?: Date | undefined } {
  if (!(dateFrom && dateTo)) {
    const result: { adjustedDateFrom?: Date; adjustedDateTo?: Date } = {};
    if (dateFrom) result.adjustedDateFrom = dateFrom;
    if (dateTo) result.adjustedDateTo = dateTo;
    return result;
  }

  const now = new Date();
  const isCurrentMonth =
    dateTo.getMonth() === now.getMonth() && dateTo.getFullYear() === now.getFullYear();

  let adjustedDateTo = dateTo;

  // If dateTo is in the current month, extend it to the end of the month
  if (isCurrentMonth) {
    adjustedDateTo = new Date(dateTo.getFullYear(), dateTo.getMonth() + 1, 0); // Last day of the month
  }

  return { adjustedDateFrom: dateFrom, adjustedDateTo };
}

export function getLastMonthFromRange(dateFrom?: Date, dateTo?: Date) {
  void dateFrom;
  if (!dateTo) {
    // If no dateTo, use current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Return the month of dateTo in YYYY-MM format
  return `${dateTo.getFullYear()}-${String(dateTo.getMonth() + 1).padStart(2, '0')}`;
}

// Helper function to format date based on whether it's this year
export function formatMonthYear(dateString: string) {
  // Parse YYYY-MM format explicitly to avoid timezone issues
  const [yearStr, monthStr] = dateString.split('-');
  if (!(yearStr && monthStr)) {
    return '';
  }

  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1; // JavaScript months are 0-indexed

  if (Number.isNaN(year) || Number.isNaN(month)) {
    return '';
  }

  const date = new Date(year, month, 1);
  const currentYear = new Date().getFullYear();

  if (year === currentYear) {
    // This year - show month name only
    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  }

  // Other years - show month and year like "Dec 24"
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date);
}
