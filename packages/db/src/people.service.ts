import { db } from '.';
import { asc, eq, inArray } from 'drizzle-orm';
import { calendarAttendees } from '@hominem/db/schema/calendar';
import { persons } from '@hominem/db/schema/persons';

export type PersonSelect = typeof persons.$inferSelect;

export interface PersonInput {
  userId: string;
  personType?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export async function getPeopleForEvent(
  eventId: string,
): Promise<Array<{ id: string; firstName: string | null; lastName: string | null }>> {
  return db
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
    })
    .from(calendarAttendees)
    .innerJoin(persons, eq(calendarAttendees.personId, persons.id))
    .where(eq(calendarAttendees.eventId, eventId));
}

export async function getPeopleForEvents(
  eventIds: string[],
): Promise<Map<string, Array<{ id: string; firstName: string | null; lastName: string | null }>>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      eventId: calendarAttendees.eventId,
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
    })
    .from(calendarAttendees)
    .innerJoin(persons, eq(calendarAttendees.personId, persons.id))
    .where(inArray(calendarAttendees.eventId, eventIds));

  const map = new Map<
    string,
    Array<{ id: string; firstName: string | null; lastName: string | null }>
  >();
  for (const row of rows) {
    if (!row.eventId) {
      continue;
    }
    if (!map.has(row.eventId)) {
      map.set(row.eventId, []);
    }
    map.get(row.eventId)!.push({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
    });
  }
  return map;
}

export async function replacePeopleForEvent(eventId: string, people?: string[]) {
  if (people === undefined) {
    return;
  }
  if (people.length === 0) {
    return;
  }

  await db.delete(calendarAttendees).where(eq(calendarAttendees.eventId, eventId));

  if (people.length === 0) {
    return;
  }

  const relationships = people.map((personId) => ({
    eventId,
    personId,
  }));
  await db.insert(calendarAttendees).values(relationships);
}

export async function getPeople({ userId }: { userId: string }): Promise<PersonSelect[]> {
  return db
    .select()
    .from(persons)
    .where(eq(persons.ownerUserId, userId))
    .orderBy(asc(persons.firstName));
}

export async function getPersonById(id: string): Promise<PersonSelect | null> {
  const result = await db.select().from(persons).where(eq(persons.id, id)).limit(1);

  return result[0] ?? null;
}

export async function createPerson(person: PersonInput): Promise<PersonSelect> {
  if (!person.firstName) {
    throw new Error('firstName is required');
  }

  const [result] = await db
    .insert(persons)
    .values({
      ownerUserId: person.userId,
      personType: person.personType ?? 'contact',
      firstName: person.firstName,
      lastName: person.lastName || null,
      email: person.email || null,
      phone: person.phone || null,
    })
    .returning();

  if (!result) {
    throw new Error('Failed to create person');
  }

  return result;
}

export async function updatePerson(id: string, person: PersonInput): Promise<PersonSelect | null> {
  const updateData: Record<string, unknown> = {};

  if (person.firstName !== undefined) {
    updateData.firstName = person.firstName;
  }
  if (person.lastName !== undefined) {
    updateData.lastName = person.lastName;
  }
  if (person.email !== undefined) {
    updateData.email = person.email;
  }
  if (person.phone !== undefined) {
    updateData.phone = person.phone;
  }

  const result = await db.update(persons).set(updateData).where(eq(persons.id, id)).returning();

  return result[0] ?? null;
}

export async function deletePerson(id: string): Promise<boolean> {
  await db.delete(calendarAttendees).where(eq(calendarAttendees.personId, id));

  const result = await db.delete(persons).where(eq(persons.id, id)).returning();

  return result.length > 0;
}
