import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import type { CalendarExportEvent } from '../src/calendar/ical';
import { createIcal } from '../src/calendar/ical';

const LOCAL_DEV_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5434/hominem';

function die(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function resolveDatabaseUrl(environment: 'development' | 'production'): string {
  if (environment === 'production') {
    const url = process.env.PRODUCTION_DATABASE_URL;
    if (!url) die('PRODUCTION_DATABASE_URL must be set for production exports.');
    return url;
  }
  return process.env.DATABASE_URL ?? LOCAL_DEV_DATABASE_URL;
}

function validateDateOption(name: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (Number.isNaN(Date.parse(value))) die(`--${name} must be an ISO date or datetime.`);
  return value;
}

async function main() {
  const { values } = parseArgs({
    options: {
      userId: { type: 'string' },
      userEmail: { type: 'string' },
      env: { type: 'string', default: 'development' },
      from: { type: 'string' },
      to: { type: 'string' },
      includeCancelled: { type: 'boolean', default: false },
      out: { type: 'string' },
      yes: { type: 'boolean', default: false },
    },
  });

  if (!values.userId && !values.userEmail) die('--userId or --userEmail is required.');
  if (values.userId && values.userEmail) die('Use only one of --userId or --userEmail.');
  if (values.env !== 'development' && values.env !== 'production') {
    die('--env must be "development" or "production".');
  }
  if (values.env === 'production' && !values.yes) {
    die('Exporting from production requires --yes to confirm.');
  }

  const from = validateDateOption('from', values.from);
  const to = validateDateOption('to', values.to);
  const databaseUrl = resolveDatabaseUrl(values.env);
  process.env.DATABASE_URL = databaseUrl;

  const { pool } = await import('@hominem/db/core');
  const userId =
    values.userId ??
    (
      await pool.query<{ id: string }>('SELECT id FROM "user" WHERE lower(email) = lower($1)', [
        values.userEmail,
      ])
    ).rows[0]?.id;
  if (!userId) die(`No user found for ${values.userEmail ?? values.userId} in ${values.env}.`);
  const outputPath = values.out ?? `calendar-${new Date().toISOString().replace(/[:.]/g, '-')}.ics`;
  const result = await pool.query<CalendarExportEvent>(
    `
      SELECT
        e.id,
        e.title,
        e.description,
        e.starts_at AS "startsAt",
        e.ends_at AS "endsAt",
        e.is_all_day AS "isAllDay",
        e.recurrence_rule AS "recurrenceRule",
        e.external_uid AS "externalUid",
        e.status,
        e.organizer,
        e.updatedat AS "updatedAt",
        p.name AS "placeName",
        p.formatted_address AS "formattedAddress",
        COALESCE(
          json_agg(
            json_build_object('name', person.display_name, 'email', email.value)
            ORDER BY person.display_name
          ) FILTER (WHERE person.id IS NOT NULL),
          '[]'::json
        ) AS attendees
      FROM app.calendar_events e
      LEFT JOIN app.places p ON p.id = e.place_id
      LEFT JOIN app.calendar_event_attendees event_attendee ON event_attendee.event_id = e.id
      LEFT JOIN app.people person ON person.id = event_attendee.person_id
      LEFT JOIN LATERAL (
        SELECT contact.value
        FROM app.person_contact_methods contact
        WHERE contact.person_id = person.id AND contact.kind = 'email'
        ORDER BY contact.is_primary DESC, contact.id
        LIMIT 1
      ) email ON true
      WHERE e.owner_userid = $1
        AND ($2::timestamptz IS NULL OR e.starts_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR e.starts_at <= $3::timestamptz)
        AND ($4::boolean OR lower(coalesce(e.status, '')) <> 'cancelled')
      GROUP BY e.id, p.name, p.formatted_address
      ORDER BY e.starts_at ASC, e.id ASC
    `,
    [userId, from ?? null, to ?? null, values.includeCancelled],
  );

  await writeFile(outputPath, createIcal(result.rows), 'utf8');
  console.log(`✓ exported ${result.rowCount ?? 0} event(s) to ${outputPath}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
