export type CalendarExportAttendee = {
  name: string | null;
  email: string | null;
};

export type CalendarExportEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  isAllDay: boolean;
  recurrenceRule: string | null;
  externalUid: string | null;
  status: string | null;
  organizer: string | null;
  updatedAt: string;
  placeName: string | null;
  formattedAddress: string | null;
  attendees: CalendarExportAttendee[];
};

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function escapeParameter(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/:/g, '\\:');
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid event date: ${value}`);
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid event date: ${value}`);
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const character of line) {
    const characterBytes = new TextEncoder().encode(character).length;
    if (currentBytes + characterBytes > 75) {
      parts.push(current);
      current = ` ${character}`;
      currentBytes = 1 + characterBytes;
    } else {
      current += character;
      currentBytes += characterBytes;
    }
  }
  if (current) parts.push(current);
  return parts.join('\r\n');
}

function property(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

function normalizedStatus(status: string | null): 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED' | null {
  const normalized = status?.toUpperCase();
  return normalized === 'TENTATIVE' || normalized === 'CONFIRMED' || normalized === 'CANCELLED'
    ? normalized
    : null;
}

function recurrenceProperty(rule: string): string {
  return property('RRULE', rule.replace(/^RRULE:/i, ''));
}

export function createIcal(events: CalendarExportEvent[], generatedAt = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hominem//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    const uid = event.externalUid || `${event.id}@hominem`;
    const location = [event.placeName, event.formattedAddress].filter(Boolean).join(', ');
    const status = normalizedStatus(event.status);

    lines.push('BEGIN:VEVENT');
    lines.push(property('UID', escapeText(uid)));
    lines.push(property('DTSTAMP', formatDateTime(event.updatedAt || generatedAt.toISOString())));
    lines.push(
      event.isAllDay
        ? `DTSTART;VALUE=DATE:${formatDate(event.startsAt)}`
        : property('DTSTART', formatDateTime(event.startsAt)),
    );
    if (event.endsAt) {
      lines.push(
        event.isAllDay
          ? `DTEND;VALUE=DATE:${formatDate(event.endsAt)}`
          : property('DTEND', formatDateTime(event.endsAt)),
      );
    }
    lines.push(property('SUMMARY', escapeText(event.title)));
    if (event.description) lines.push(property('DESCRIPTION', escapeText(event.description)));
    if (location) lines.push(property('LOCATION', escapeText(location)));
    if (event.recurrenceRule) lines.push(recurrenceProperty(event.recurrenceRule));
    if (status) lines.push(property('STATUS', status));
    if (event.organizer?.includes('@')) {
      lines.push(
        `ORGANIZER;CN=${escapeParameter(event.organizer)}:mailto:${escapeText(event.organizer)}`,
      );
    }
    for (const attendee of event.attendees) {
      if (attendee.email?.includes('@')) {
        const name = attendee.name ? `;CN=${escapeParameter(attendee.name)}` : '';
        lines.push(`ATTENDEE${name}:mailto:${escapeText(attendee.email)}`);
      }
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
