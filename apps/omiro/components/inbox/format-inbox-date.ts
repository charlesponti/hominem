import t from '~/translations';

const DAY_MS = 24 * 60 * 60 * 1000;
const PG_TZ_OFFSET = /([+-]\d{2})(?::?(\d{2}))?$/;

// Postgres timestamptz columns come back as native strings (e.g.
// "2026-08-10 14:14:39.401575+00"), not ISO 8601. V8 parses that loosely,
// but Hermes (React Native's JS engine) doesn't, so it needs normalizing to
// "...T...+00:00" before we hand it to `Date`.
function parsePgDate(value: string): Date {
  const isoish = value.trim().replace(' ', 'T');
  const match = isoish.match(PG_TZ_OFFSET);
  if (!match) return new Date(isoish);
  const [offset, , minutes = '00'] = match;
  return new Date(`${isoish.slice(0, -offset.length)}${offset}:${minutes}`);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export function inboxDayGroupKey(rawDate: string): string {
  const date = parsePgDate(rawDate);
  if (!isValidDate(date)) return 'unknown';
  const now = new Date();
  const diff = daysAgo(date, now);

  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return startOfDay(date).toISOString();
}

export function inboxDayGroupLabel(rawDate: string): string {
  const date = parsePgDate(rawDate);
  if (!isValidDate(date)) return t.inbox.item.earlier;
  const now = new Date();
  const diff = daysAgo(date, now);

  if (diff === 0) return t.inbox.item.today;
  if (diff === 1) return t.inbox.item.yesterday;
  if (diff > 1 && diff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}
