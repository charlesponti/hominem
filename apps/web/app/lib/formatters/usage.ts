const periodFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const timestampFormatter = new Intl.DateTimeFormat('en-US');

export function formatUsagePeriod(value: string): string {
  return periodFormatter.format(new Date(value));
}

export function formatUsageTimestamp(value: string): string {
  return timestampFormatter.format(new Date(value));
}
