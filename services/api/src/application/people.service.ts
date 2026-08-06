import { db, sql } from '@hominem/db';
import z from 'zod';

import type { personSummarySchema } from '../schemas/people.schema';

export type PersonSummary = z.output<typeof personSummarySchema>;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function getPersonById(personId: string) {
  return db.selectFrom('app.people').selectAll().where('id', '=', personId).executeTakeFirst();
}

export async function getPersonEmails(personId: string) {
  return db
    .selectFrom('app.personContactMethods')
    .select(['value as email', 'isPrimary', 'source'])
    .where('personId', '=', personId)
    .where('kind', '=', 'email')
    .execute();
}

export async function getPersonPhoneNumbers(personId: string) {
  return db
    .selectFrom('app.personContactMethods')
    .select(['value as phoneNumber', 'isPrimary'])
    .where('personId', '=', personId)
    .where('kind', '=', 'phone')
    .execute();
}

export async function getPersonMemberships(personId: string) {
  return db
    .selectFrom('app.organizationMemberships as membership')
    .innerJoin('app.organizations as organization', 'organization.id', 'membership.organizationId')
    .select(['organization.name as organization', 'membership.isPrimary', 'membership.source'])
    .where('membership.personId', '=', personId)
    .execute();
}

export async function getPersonTags(personId: string) {
  return (
    db
      .selectFrom('app.tagAssignments as assignment')
      .innerJoin('app.tags as tag', 'tag.id', 'assignment.tagId')
      .select('tag.name as name')
      // `entity_table` is a `regclass` column; comparing it through a bound parameter makes
      // node-pg send the literal as an oid instead of resolving it via regclass's text input,
      // so the fixed table-name constant is inlined as raw SQL instead.
      .where(sql<boolean>`assignment.entity_table = 'app.people'::regclass`)
      .where('assignment.entityId', '=', personId)
      .where('assignment.removedAt', 'is', null)
      .execute()
  );
}

export async function getPersonPeople({
  ownerUserId,
  query,
  limit,
}: {
  ownerUserId: string;
  query: string;
  limit: number;
}) {
  const pattern = `%${escapeLike(query.toLowerCase())}%`;
  const nameOrAliasMatch = sql<boolean>`(
          lower(coalesce(display_name, '')) like ${pattern} escape '\\'
          or lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) like ${pattern} escape '\\'
          or exists (
            select 1 from jsonb_array_elements_text(aliases) as alias
            where lower(alias) like ${pattern} escape '\\'
          )
        )`;
  const searchResults = await db
    .selectFrom('app.people')
    .select('id')
    .where('ownerUserid', '=', ownerUserId)
    .where(nameOrAliasMatch)
    .limit(limit)
    .execute();

  const people = (
    await Promise.all(searchResults.map((match) => loadPersonSummary(match.id)))
  ).filter((person): person is PersonSummary => person !== null);

  return { people, count: people.length };
}

export async function getPersonTimeline({
  ownerUserId,
  personId,
}: {
  ownerUserId: string;
  personId: string;
}) {
  const ownedPerson = await db
    .selectFrom('app.people')
    .select('id')
    .where('id', '=', personId)
    .where('ownerUserid', '=', ownerUserId)
    .executeTakeFirst();

  if (!ownedPerson) {
    return { person: null, calendarEvents: [], trips: [], relations: [], socialContacts: [] };
  }

  const [person, calendarEvents, trips, relations, relationsBackward] = await Promise.all([
    loadPersonSummary(personId),
    db
      .selectFrom('app.eventAttendees as a')
      .innerJoin('app.events as e', 'e.id', 'a.eventId')
      .select(['e.id as id', 'e.title as title', 'e.startsAt as startsAt', 'a.role as role'])
      .where('a.personId', '=', personId)
      .where('e.ownerUserid', '=', ownerUserId)
      .orderBy('e.startsAt', 'desc')
      .limit(20)
      .execute(),
    db
      .selectFrom('app.travelTripAttendees as a')
      .innerJoin('app.travelTrips as t', 't.id', 'a.tripId')
      .select([
        't.id as id',
        't.city as city',
        't.state as state',
        't.country as country',
        't.startDate as startDate',
        't.endDate as endDate',
        'a.role as role',
      ])
      .where('a.personId', '=', personId)
      .where('t.ownerUserid', '=', ownerUserId)
      .orderBy('t.startDate', 'desc')
      .limit(20)
      .execute(),
    db
      .selectFrom('app.personRelationships as r')
      .innerJoin('app.people as p', 'p.id', 'r.toPersonId')
      .select([
        'r.toPersonId as relatedPersonId',
        'p.displayName as relatedDisplayName',
        'r.relationshipType as relation',
        'r.startedAt as startedAt',
        'r.endedAt as endedAt',
      ])
      .where('r.fromPersonId', '=', personId)
      .where('r.ownerUserid', '=', ownerUserId)
      .orderBy('r.startedAt', 'desc')
      .limit(25)
      .execute(),
    db
      .selectFrom('app.personRelationships as r')
      .innerJoin('app.people as p', 'p.id', 'r.fromPersonId')
      .select([
        'r.fromPersonId as relatedPersonId',
        'p.displayName as relatedDisplayName',
        'r.relationshipType as relation',
        'r.startedAt as startedAt',
        'r.endedAt as endedAt',
      ])
      .where('r.toPersonId', '=', personId)
      .where('r.ownerUserid', '=', ownerUserId)
      .orderBy('r.startedAt', 'desc')
      .limit(25)
      .execute(),
  ]);

  return {
    person,
    calendarEvents,
    trips,
    relations: [...relations, ...relationsBackward],
    socialContacts: [],
  };
}

async function loadPersonSummary(personId: string): Promise<PersonSummary | null> {
  const person = await getPersonById(personId);
  if (!person) {
    return null;
  }

  const [emails, phones, organizations, tags] = await Promise.all([
    getPersonEmails(personId),
    getPersonPhoneNumbers(personId),
    getPersonMemberships(personId),
    getPersonTags(personId),
  ]);

  return {
    id: person.id,
    displayName: person.displayName,
    firstName: person.firstName,
    lastName: person.lastName,
    personType: person.personType,
    notes: person.notes,
    emails: emails.map((row) => ({
      email: row.email,
      isPrimary: row.isPrimary,
      source: row.source,
    })),
    phones: phones.map((row) => ({
      phoneNumber: row.phoneNumber,
      isPrimary: row.isPrimary,
    })),
    organizations: organizations.map((row) => ({
      organization: row.organization,
      isPrimary: row.isPrimary,
      source: row.source,
    })),
    tags: tags.map((row) => row.name),
  };
}
