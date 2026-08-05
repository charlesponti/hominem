import { db } from '@hominem/db';

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
    .$if(from !== undefined, (qb) => qb.where('pv.visitedAt', '>=', from as string))
    .$if(to !== undefined, (qb) => qb.where('pv.visitedAt', '<=', endOfDay(to as string)))
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
