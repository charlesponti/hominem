function formatMonthYear(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
) {
  return `${formatMonthYear(startDate) ?? 'Present'} - ${formatMonthYear(endDate) ?? 'Present'}`;
}
