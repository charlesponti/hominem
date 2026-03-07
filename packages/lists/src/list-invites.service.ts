import crypto from 'node:crypto';

import { ConflictError, ForbiddenError, NotFoundError, ValidationError, db } from '@hominem/db';
import { sql } from 'kysely';
import * as z from 'zod';

import type { ListOutput } from './contracts';
import { formatList } from './list-crud.service';

interface ListInviteRow {
  id: string;
  list_id: string;
  user_id: string;
  invited_user_email: string;
  invited_user_id: string | null;
  accepted: boolean;
  token: string;
  accepted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  list_name?: string | null;
  list_owner_id?: string | null;
  list_owner_email?: string | null;
  list_owner_name?: string | null;
  inviting_user_id?: string | null;
  inviting_user_email?: string | null;
  inviting_user_name?: string | null;
}

export interface ListInviteOutput {
  id: string;
  listId: string;
  userId: string;
  invitedUserEmail: string;
  invitedUserId: string | null;
  accepted: boolean;
  token: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserOutput {
  id: string;
  email: string;
  name: string | null;
}

export const sendListInviteSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  invitedUserEmail: z.string().email('Invalid email format'),
  invitingUserId: z.string().uuid('Invalid user ID'),
  baseUrl: z.string().url('Invalid base URL'),
});

export type SendListInviteParams = z.infer<typeof sendListInviteSchema>;

export const acceptListInviteSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  acceptingUserId: z.string().uuid('Invalid user ID'),
  token: z.string().min(1, 'Token required'),
});

export type AcceptListInviteParams = z.infer<typeof acceptListInviteSchema>;

export const deleteListInviteSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  invitedUserEmail: z.string().email('Invalid email format'),
  userId: z.string().uuid('Invalid user ID'),
});

export type DeleteListInviteParams = z.infer<typeof deleteListInviteSchema>;

function toOutput(row: ListInviteRow): ListInviteOutput {
  const createdAt = row.created_at ?? new Date().toISOString();
  const updatedAt = row.updated_at ?? createdAt;
  return {
    id: row.id,
    listId: row.list_id,
    userId: row.user_id,
    invitedUserEmail: row.invited_user_email,
    invitedUserId: row.invited_user_id,
    accepted: row.accepted,
    token: row.token,
    acceptedAt: row.accepted_at,
    createdAt,
    updatedAt,
  };
}

function toListOutput(row: ListInviteRow): ListOutput | null {
  if (!row.list_name || !row.list_owner_id || !row.list_owner_email) {
    return null;
  }
  const createdAt = row.created_at ?? new Date().toISOString();
  return formatList(
    {
      id: row.list_id,
      name: row.list_name,
      description: null,
      ownerId: row.list_owner_id,
      isPublic: false,
      createdAt,
      updatedAt: createdAt,
      owner: {
        id: row.list_owner_id,
        email: row.list_owner_email,
        name: row.list_owner_name ?? null,
      },
    },
    [],
    false,
    true,
  );
}

function toInvitingUserOutput(row: ListInviteRow): UserOutput | null {
  if (!row.inviting_user_id || !row.inviting_user_email) {
    return null;
  }
  return {
    id: row.inviting_user_id,
    email: row.inviting_user_email,
    name: row.inviting_user_name ?? null,
  };
}

async function getUserByEmail(email: string): Promise<{ id: string } | null> {
  const result = await db
    .selectFrom('users')
    .select('id')
    .where(sql`lower(email)`, '=', email.toLowerCase())
    .executeTakeFirst();
  return result ?? null;
}

async function ensureListOwner(listId: string, ownerId: string): Promise<void> {
  const result = await db
    .selectFrom('task_lists')
    .select('id')
    .where((eb) => eb.and([eb('id', '=', listId), eb('user_id', '=', ownerId)]))
    .executeTakeFirst();

  if (!result) {
    throw new ForbiddenError("You don't have permission to invite users to this list");
  }
}

async function getInviteRowByToken(token: string): Promise<ListInviteRow | null> {
  const result = await db
    .selectFrom('task_list_invites as li')
    .innerJoin('task_lists as tl', 'tl.id', 'li.list_id')
    .innerJoin('users as u_owner', 'u_owner.id', 'tl.user_id')
    .innerJoin('users as u_inviter', 'u_inviter.id', 'li.user_id')
    .select([
      'li.id',
      'li.list_id',
      'li.user_id',
      'li.invited_user_email',
      'li.invited_user_id',
      'li.accepted',
      'li.token',
      'li.accepted_at',
      'li.created_at',
      'li.updated_at',
      sql<string>`tl.name`.as('list_name'),
      sql<string>`tl.user_id`.as('list_owner_id'),
      sql<string>`u_owner.email`.as('list_owner_email'),
      sql<string>`u_owner.name`.as('list_owner_name'),
      sql<string>`u_inviter.id`.as('inviting_user_id'),
      sql<string>`u_inviter.email`.as('inviting_user_email'),
      sql<string>`u_inviter.name`.as('inviting_user_name'),
    ])
    .where('li.token', '=', token)
    .executeTakeFirst();

  return (result as ListInviteRow | undefined) ?? null;
}

export async function getListInvites(
  listId: string,
): Promise<
  (ListInviteOutput & { list: ListOutput | null; user_invitedUserId: UserOutput | null })[]
> {
  const result = await db
    .selectFrom('task_list_invites as li')
    .innerJoin('task_lists as tl', 'tl.id', 'li.list_id')
    .innerJoin('users as u_owner', 'u_owner.id', 'tl.user_id')
    .innerJoin('users as u_inviter', 'u_inviter.id', 'li.user_id')
    .select([
      'li.id',
      'li.list_id',
      'li.user_id',
      'li.invited_user_email',
      'li.invited_user_id',
      'li.accepted',
      'li.token',
      'li.accepted_at',
      'li.created_at',
      'li.updated_at',
      sql<string>`tl.name`.as('list_name'),
      sql<string>`tl.user_id`.as('list_owner_id'),
      sql<string>`u_owner.email`.as('list_owner_email'),
      sql<string>`u_owner.name`.as('list_owner_name'),
      sql<string>`u_inviter.id`.as('inviting_user_id'),
      sql<string>`u_inviter.email`.as('inviting_user_email'),
      sql<string>`u_inviter.name`.as('inviting_user_name'),
    ])
    .where('li.list_id', '=', listId)
    .orderBy('li.created_at', 'desc')
    .orderBy('li.id', 'asc')
    .execute();

  return (result as ListInviteRow[]).map((row) => ({
    ...toOutput(row),
    list: toListOutput(row),
    user_invitedUserId: toInvitingUserOutput(row),
  }));
}

export async function getInvitesForUser(
  userId: string,
  normalizedEmail?: string | null,
): Promise<(ListInviteOutput & { list: ListOutput | null })[]> {
  const email = normalizedEmail?.toLowerCase() ?? null;

  const result = await db
    .selectFrom('task_list_invites as li')
    .innerJoin('task_lists as tl', 'tl.id', 'li.list_id')
    .innerJoin('users as u_owner', 'u_owner.id', 'tl.user_id')
    .select([
      'li.id',
      'li.list_id',
      'li.user_id',
      'li.invited_user_email',
      'li.invited_user_id',
      'li.accepted',
      'li.token',
      'li.accepted_at',
      'li.created_at',
      'li.updated_at',
      sql<string>`tl.name`.as('list_name'),
      sql<string>`tl.user_id`.as('list_owner_id'),
      sql<string>`u_owner.email`.as('list_owner_email'),
      sql<string>`u_owner.name`.as('list_owner_name'),
    ])
    .where((eb) =>
      eb.or(
        [
          eb('li.invited_user_id', '=', userId),
          email && email.length > 0 ? eb(sql`lower(li.invited_user_email)`, '=', email) : undefined,
          // eslint-disable-next-line typescript-eslint/no-explicit-any
        ].filter(Boolean) as any,
      ),
    )
    .orderBy('li.created_at', 'desc')
    .orderBy('li.id', 'asc')
    .execute();

  return (result as ListInviteRow[]).map((row) => ({
    ...toOutput(row),
    list: toListOutput(row),
  }));
}

export async function getInviteByToken(
  token: string,
): Promise<ListInviteOutput & { list: ListOutput | null }> {
  const row = await getInviteRowByToken(token);
  if (!row) {
    throw new NotFoundError(`Invite not found for token: ${token}`);
  }
  return {
    ...toOutput(row),
    list: toListOutput(row),
  };
}

export async function getInviteByListAndToken(params: {
  listId: string;
  token: string;
}): Promise<ListInviteOutput> {
  const row = await db
    .selectFrom('task_list_invites')
    .selectAll()
    .where((eb) => eb.and([eb('list_id', '=', params.listId), eb('token', '=', params.token)]))
    .executeTakeFirst();

  if (!row) {
    throw new NotFoundError(`Invite not found for listId ${params.listId}`);
  }

  return toOutput(row as ListInviteRow);
}

export async function deleteInviteByListAndToken(params: {
  listId: string;
  token: string;
}): Promise<boolean> {
  const result = await db
    .deleteFrom('task_list_invites')
    .where((eb) => eb.and([eb('list_id', '=', params.listId), eb('token', '=', params.token)]))
    .returningAll()
    .execute();

  return Boolean(result[0]);
}

export async function getOutboundInvites(
  userId: string,
): Promise<(ListInviteOutput & { list: ListOutput; user_invitedUserId: UserOutput | null })[]> {
  const result = await db
    .selectFrom('task_list_invites as li')
    .innerJoin('task_lists as tl', 'tl.id', 'li.list_id')
    .innerJoin('users as u_owner', 'u_owner.id', 'tl.user_id')
    .innerJoin('users as u_inviter', 'u_inviter.id', 'li.user_id')
    .select([
      'li.id',
      'li.list_id',
      'li.user_id',
      'li.invited_user_email',
      'li.invited_user_id',
      'li.accepted',
      'li.token',
      'li.accepted_at',
      'li.created_at',
      'li.updated_at',
      sql<string>`tl.name`.as('list_name'),
      sql<string>`tl.user_id`.as('list_owner_id'),
      sql<string>`u_owner.email`.as('list_owner_email'),
      sql<string>`u_owner.name`.as('list_owner_name'),
      sql<string>`u_inviter.id`.as('inviting_user_id'),
      sql<string>`u_inviter.email`.as('inviting_user_email'),
      sql<string>`u_inviter.name`.as('inviting_user_name'),
    ])
    .where('li.user_id', '=', userId)
    .orderBy('li.created_at', 'desc')
    .orderBy('li.id', 'asc')
    .execute();

  return (result as ListInviteRow[]).map((row) => ({
    ...toOutput(row),
    list: toListOutput(row) as ListOutput,
    user_invitedUserId: toInvitingUserOutput(row),
  }));
}

export async function sendListInvite(params: SendListInviteParams): Promise<ListInviteOutput> {
  const normalizedEmail = params.invitedUserEmail.toLowerCase();
  await ensureListOwner(params.listId, params.invitingUserId);

  const invitee = await getUserByEmail(normalizedEmail);
  if (invitee && invitee.id === params.invitingUserId) {
    throw new ValidationError('You cannot invite yourself to a list');
  }

  const pending = await db
    .selectFrom('task_list_invites')
    .select('id')
    .where((eb) =>
      eb.and([
        eb('list_id', '=', params.listId),
        eb(sql`lower(invited_user_email)`, '=', normalizedEmail),
        eb('accepted', '=', false),
      ]),
    )
    .executeTakeFirst();

  if (pending) {
    throw new ConflictError('A pending invite already exists for this user');
  }

  if (invitee) {
    const membership = await db
      .selectFrom('task_list_collaborators')
      .select('list_id')
      .where((eb) => eb.and([eb('list_id', '=', params.listId), eb('user_id', '=', invitee.id)]))
      .executeTakeFirst();

    if (membership) {
      throw new ConflictError('This user is already a member of this list');
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  const row = await db
    .insertInto('task_list_invites')
    .values({
      list_id: params.listId,
      user_id: params.invitingUserId,
      invited_user_email: normalizedEmail,
      invited_user_id: invitee?.id ?? null,
      accepted: false,
      token,
    })
    .returningAll()
    .executeTakeFirst();

  if (!row) {
    throw new ValidationError('Failed to create list invite');
  }

  return toOutput(row as ListInviteRow);
}

export async function acceptListInvite(params: AcceptListInviteParams): Promise<ListOutput> {
  const invite = await getInviteRowByToken(params.token);
  if (!invite || invite.list_id !== params.listId) {
    throw new NotFoundError('Invite not found');
  }
  if (invite.user_id === params.acceptingUserId) {
    throw new ValidationError('Owner cannot accept own invite');
  }
  if (invite.invited_user_id && invite.invited_user_id !== params.acceptingUserId) {
    throw new ForbiddenError('This invite belongs to a different user');
  }
  if (invite.accepted) {
    throw new ConflictError('Invite already accepted');
  }

  const createdMembership = await db
    .insertInto('task_list_collaborators')
    .values({
      list_id: invite.list_id,
      user_id: params.acceptingUserId,
      added_by_user_id: invite.user_id,
    })
    .onConflict((oc) => oc.doNothing())
    .returningAll()
    .executeTakeFirst();

  if (!createdMembership) {
    const existingMembership = await db
      .selectFrom('task_list_collaborators')
      .select('list_id')
      .where((eb) =>
        eb.and([eb('list_id', '=', invite.list_id), eb('user_id', '=', params.acceptingUserId)]),
      )
      .executeTakeFirst();

    if (!existingMembership) {
      throw new ConflictError('Failed to create list membership');
    }
  }

  await db
    .updateTable('task_list_invites')
    .set({
      invited_user_id: params.acceptingUserId,
      accepted: true,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', invite.id)
    .execute();

  const listRow = await db
    .selectFrom('task_lists as tl')
    .innerJoin('users as u_owner', 'u_owner.id', 'tl.user_id')
    .select([
      sql<string>`tl.id`.as('list_id'),
      sql<string>`tl.name`.as('list_name'),
      sql<string>`tl.user_id`.as('list_owner_id'),
      sql<string>`u_owner.email`.as('list_owner_email'),
      sql<string>`u_owner.name`.as('list_owner_name'),
      'tl.created_at',
    ])
    .where('tl.id', '=', invite.list_id)
    .executeTakeFirst();

  if (!listRow) {
    throw new NotFoundError('List not found');
  }

  const listOutput = toListOutput(listRow as unknown as ListInviteRow);
  if (!listOutput) {
    throw new NotFoundError('List not found');
  }

  return listOutput;
}

export async function deleteListInvite(params: DeleteListInviteParams): Promise<void> {
  await ensureListOwner(params.listId, params.userId);
  const normalizedEmail = params.invitedUserEmail.toLowerCase();

  const result = await db
    .deleteFrom('task_list_invites')
    .where((eb) =>
      eb.and([
        eb('list_id', '=', params.listId),
        eb(sql`lower(invited_user_email)`, '=', normalizedEmail),
      ]),
    )
    .returningAll()
    .execute();

  if (!result[0]) {
    throw new NotFoundError('Invite not found');
  }
}
