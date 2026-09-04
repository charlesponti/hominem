import { db, NotFoundError, sql } from '@hominem/db';

function toIso(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function endOfDay(isoDate: string): string {
  return `${isoDate}T23:59:59.999Z`;
}

export async function getPlaceVisitHistory(
  ownerUserId: string,
  opts: { from?: string; to?: string; limit: number },
) {
  const { from, to, limit } = opts;

  const rows = await db
    .selectFrom('app.placeVisits as pv')
    .leftJoin('app.places as pl', 'pl.id', 'pv.placeId')
    .select([
      'pv.id as id',
      'pl.name as placeName',
      'pl.formattedAddress as address',
      'pv.visitedAt as visitedAt',
      'pv.purpose as purpose',
      'pv.notes as notes',
    ])
    .where('pv.ownerUserid', '=', ownerUserId)
    .$if(from !== undefined, (qb) => qb.where('pv.visitedAt', '>=', from!))
    .$if(to !== undefined, (qb) => qb.where('pv.visitedAt', '<=', endOfDay(to!)))
    .orderBy('pv.visitedAt', 'desc')
    .limit(limit)
    .execute();

  const visits = rows.map((row) => ({
    id: row.id,
    placeName: row.placeName,
    address: row.address,
    visitedAt: toIso(row.visitedAt),
    purpose: row.purpose,
    notes: row.notes,
  }));

  return { visits, count: visits.length };
}

export type FindOrCreatePlaceInput =
  | { placeId: string }
  | { name: string; address?: string; latitude?: number; longitude?: number };

/**
 * Resolves an app.places row for the caller — reuses an existing one (by id, or by
 * matching address/coordinates) instead of making a new place every time the same
 * location comes up.
 */
export async function findOrCreatePlace(
  ownerUserId: string,
  input: FindOrCreatePlaceInput,
): Promise<string> {
  if ('placeId' in input) {
    const row = await db
      .selectFrom('app.places')
      .select('id')
      .where('id', '=', input.placeId)
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();
    if (!row) throw new NotFoundError('Place', { placeId: input.placeId });
    return row.id;
  }

  // only reuse a row when we've got a real signal to match on — an empty filter
  // here would just match whatever unrelated place happens to come back first
  const existing = await db
    .selectFrom('app.places')
    .select('id')
    .where('ownerUserid', '=', ownerUserId)
    .$if(input.address !== undefined, (qb) => qb.where('formattedAddress', '=', input.address!))
    .$if(input.address === undefined && input.latitude !== undefined, (qb) =>
      qb
        .where('latitude', '=', String(input.latitude))
        .where('longitude', '=', String(input.longitude)),
    )
    .$if(input.address === undefined && input.latitude === undefined, (qb) =>
      qb.where(sql<boolean>`lower(name) = lower(${input.name})`),
    )
    .executeTakeFirst();
  if (existing) return existing.id;

  const created = await db
    .insertInto('app.places')
    .values({
      ownerUserid: ownerUserId,
      name: input.name,
      formattedAddress: input.address ?? null,
      latitude: input.latitude !== undefined ? String(input.latitude) : null,
      longitude: input.longitude !== undefined ? String(input.longitude) : null,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return created.id;
}
