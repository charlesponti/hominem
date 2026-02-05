import type { Contact as ContactOutput } from '@hominem/db/schema/contacts';

import { db } from '@hominem/db';
import { eventsUsers } from '@hominem/db/schema/calendar';
import { contacts } from '@hominem/db/schema/contacts';
import { asc, eq, inArray } from '@hominem/db';

export interface PersonInput {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export async function getPeopleForEvent(
  eventId: string,
): Promise<Array<{ id: string; firstName: string; lastName: string | null }>> {
  return db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(eventsUsers)
    .innerJoin(contacts, eq(eventsUsers.personId, contacts.id))
    .where(eq(eventsUsers.eventId, eventId));
}

export async function getPeopleForEvents(
  eventIds: string[],
): Promise<Map<string, Array<{ id: string; firstName: string; lastName: string | null }>>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      eventId: eventsUsers.eventId,
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(eventsUsers)
    .innerJoin(contacts, eq(eventsUsers.personId, contacts.id))
    .where(inArray(eventsUsers.eventId, eventIds));

  const map = new Map<string, Array<{ id: string; firstName: string; lastName: string | null }>>();
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

  await db.delete(eventsUsers).where(eq(eventsUsers.eventId, eventId));

  if (people.length === 0) {
    return;
  }

  const relationships = people.map((personId) => ({
    eventId,
    personId,
  }));
  await db.insert(eventsUsers).values(relationships);
}

export async function getPeople({ userId }: { userId: string }): Promise<ContactOutput[]> {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, userId))
    .orderBy(asc(contacts.firstName));
}

export async function getPersonById(id: string): Promise<ContactOutput | null> {
  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);

  return result[0] ?? null;
}

export async function createPerson(person: PersonInput): Promise<ContactOutput> {
  if (!person.firstName) {
    throw new Error('firstName is required');
  }

  const [result] = await db
    .insert(contacts)
    .values({
      userId: person.userId,
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

export async function updatePerson(id: string, person: PersonInput): Promise<ContactOutput | null> {
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

  const result = await db.update(contacts).set(updateData).where(eq(contacts.id, id)).returning();

  return result[0] ?? null;
}

export async function deletePerson(id: string): Promise<boolean> {
  await db.delete(eventsUsers).where(eq(eventsUsers.personId, id));

  const result = await db.delete(contacts).where(eq(contacts.id, id)).returning();

  return result.length > 0;
}
