import { db, sql } from '@hominem/db';

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function endOfDay(isoDate: string): string {
  return `${isoDate}T23:59:59.999Z`;
}

function eventBaseQuery(ownerUserId: string) {
  return db
    .selectFrom('app.calendarEvents as e')
    .leftJoin('app.calendars as c', 'c.id', 'e.calendarId')
    .leftJoin('app.places as p', 'p.id', 'e.placeId')
    .select([
      'e.id as id',
      'e.title as title',
      'e.startsAt as startsAt',
      'e.endsAt as endsAt',
      'e.isAllDay as isAllDay',
      'e.status as status',
      'c.name as calendarName',
      'p.name as placeName',
      'p.formattedAddress as address',
    ])
    .where('e.ownerUserid', '=', ownerUserId);
}

export async function searchCalendarEvents(
  ownerUserId: string,
  input: {
    query: string;
    from?: string;
    to?: string;
    includeCancelled: boolean;
    limit: number;
  },
) {
  const pattern = `%${escapeLike(input.query.toLowerCase())}%`;
  const literalSearch = sql<boolean>`(
    lower(coalesce(e.title, '')) like ${pattern} escape '\\'
    or lower(coalesce(e.description, '')) like ${pattern} escape '\\'
  )`;

  const rows = await eventBaseQuery(ownerUserId)
    .where(literalSearch)
    .$if(!input.includeCancelled, (qb) =>
      qb.where(sql<boolean>`lower(coalesce(e.status, '')) != 'cancelled'`),
    )
    .$if(input.from !== undefined, (qb) => qb.where('e.startsAt', '>=', input.from as string))
    .$if(input.to !== undefined, (qb) => qb.where('e.startsAt', '<=', endOfDay(input.to as string)))
    .orderBy('e.startsAt', 'asc')
    .limit(input.limit)
    .execute();

  return { events: rows, count: rows.length };
}

export async function listUpcomingCalendarEvents(
  ownerUserId: string,
  input: { from?: string; days: number; limit: number },
  now: Date = new Date(),
) {
  const start = input.from ? `${input.from}T00:00:00.000Z` : now.toISOString();
  const until = new Date(Date.parse(start) + input.days * 86_400_000).toISOString();

  const rows = await eventBaseQuery(ownerUserId)
    .where(sql<boolean>`lower(coalesce(e.status, '')) != 'cancelled'`)
    .where('e.startsAt', '>=', start)
    .where('e.startsAt', '<=', until)
    .orderBy('e.startsAt', 'asc')
    .limit(input.limit)
    .execute();

  return { events: rows, count: rows.length };
}

export async function listTripHistory(
  ownerUserId: string,
  input: { from?: string; to?: string; limit: number },
) {
  const trips = await db
    .selectFrom('app.travelTrips')
    .select(['id', 'city', 'state', 'country', 'startDate', 'endDate'])
    .where('ownerUserid', '=', ownerUserId)
    .$if(input.from !== undefined, (qb) => qb.where('startDate', '>=', input.from as string))
    .$if(input.to !== undefined, (qb) => qb.where('startDate', '<=', input.to as string))
    .orderBy('startDate', 'desc')
    .limit(input.limit)
    .execute();

  const withAttendees = await Promise.all(
    trips.map(async (trip) => {
      const attendees = await db
        .selectFrom('app.travelTripAttendees as a')
        .innerJoin('app.people as p', 'p.id', 'a.personId')
        .select('p.displayName as displayName')
        .where('a.tripId', '=', trip.id)
        .execute();

      return {
        id: trip.id,
        city: trip.city,
        state: trip.state,
        country: trip.country,
        startDate: trip.startDate,
        endDate: trip.endDate,
        attendeeNames: attendees
          .map((a) => a.displayName)
          .filter((name): name is string => name !== null),
      };
    }),
  );

  return { trips: withAttendees, count: withAttendees.length };
}
