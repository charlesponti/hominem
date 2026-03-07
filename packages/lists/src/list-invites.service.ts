import crypto from 'node:crypto';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  db,
  sql,
} from '@hominem/db';
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

function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows as T[];
    }
  }
  return [];
}

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
  const result = await db.execute(sql`
    select id
    from users
    where lower(email) = lower(${email})
    limit 1
  `);
  return resultRows<{ id: string }>(result)[0] ?? null;
}

async function ensureListOwner(listId: string, ownerId: string): Promise<void> {
  const result = await db.execute(sql`
    select id
    from task_lists
    where id = ${listId}
      and user_id = ${ownerId}
    limit 1
  `);
  if (!resultRows<{ id: string }>(result)[0]) {
    throw new ForbiddenError("You don't have permission to invite users to this list");
  }
}

async function getInviteRowByToken(token: string): Promise<ListInviteRow | null> {
  const result = await db.execute(sql`
    select
      li.id,
      li.list_id,
      li.user_id,
      li.invited_user_email,
      li.invited_user_id,
      li.accepted,
      li.token,
      li.accepted_at,
      li.created_at,
      li.updated_at,
      tl.name as list_name,
      tl.user_id as list_owner_id,
      u_owner.email as list_owner_email,
      u_owner.name as list_owner_name,
      u_inviter.id as inviting_user_id,
      u_inviter.email as inviting_user_email,
      u_inviter.name as inviting_user_name
    from task_list_invites li
    join task_lists tl on tl.id = li.list_id
    join users u_owner on u_owner.id = tl.user_id
    join users u_inviter on u_inviter.id = li.user_id
    where li.token = ${token}
    limit 1
  `);
  return resultRows<ListInviteRow>(result)[0] ?? null;
}

export async function getListInvites(
  listId: string,
): Promise<
  (ListInviteOutput & { list: ListOutput | null; user_invitedUserId: UserOutput | null })[]
> {
  const result = await db.execute(sql`
    select
      li.id,
      li.list_id,
      li.user_id,
      li.invited_user_email,
      li.invited_user_id,
      li.accepted,
      li.token,
      li.accepted_at,
      li.created_at,
      li.updated_at,
      tl.name as list_name,
      tl.user_id as list_owner_id,
      u_owner.email as list_owner_email,
      u_owner.name as list_owner_name,
      u_inviter.id as inviting_user_id,
      u_inviter.email as inviting_user_email,
      u_inviter.name as inviting_user_name
    from task_list_invites li
    join task_lists tl on tl.id = li.list_id
    join users u_owner on u_owner.id = tl.user_id
    join users u_inviter on u_inviter.id = li.user_id
    where li.list_id = ${listId}
    order by li.created_at desc, li.id asc
  `);

  return resultRows<ListInviteRow>(result).map((row) => ({
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
  const result = await db.execute(sql`
    select
      li.id,
      li.list_id,
      li.user_id,
      li.invited_user_email,
      li.invited_user_id,
      li.accepted,
      li.token,
      li.accepted_at,
      li.created_at,
      li.updated_at,
      tl.name as list_name,
      tl.user_id as list_owner_id,
      u_owner.email as list_owner_email,
      u_owner.name as list_owner_name
    from task_list_invites li
    join task_lists tl on tl.id = li.list_id
    join users u_owner on u_owner.id = tl.user_id
    where li.invited_user_id = ${userId}
       or (${email}::text is not null and lower(li.invited_user_email) = ${email})
    order by li.created_at desc, li.id asc
  `);

  return resultRows<ListInviteRow>(result).map((row) => ({
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
  const result = await db.execute(sql`
    select
      id,
      list_id,
      user_id,
      invited_user_email,
      invited_user_id,
      accepted,
      token,
      accepted_at,
      created_at,
      updated_at
    from task_list_invites
    where list_id = ${params.listId}
      and token = ${params.token}
    limit 1
  `);
  const row = resultRows<ListInviteRow>(result)[0] ?? null;
  if (!row) {
    throw new NotFoundError(`Invite not found for listId ${params.listId}`);
  }
  return toOutput(row);
}

export async function deleteInviteByListAndToken(params: {
  listId: string;
  token: string;
}): Promise<boolean> {
  const result = await db.execute(sql`
    delete from task_list_invites
    where list_id = ${params.listId}
      and token = ${params.token}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function getOutboundInvites(
  userId: string,
): Promise<(ListInviteOutput & { list: ListOutput; user_invitedUserId: UserOutput | null })[]> {
  const result = await db.execute(sql`
    select
      li.id,
      li.list_id,
      li.user_id,
      li.invited_user_email,
      li.invited_user_id,
      li.accepted,
      li.token,
      li.accepted_at,
      li.created_at,
      li.updated_at,
      tl.name as list_name,
      tl.user_id as list_owner_id,
      u_owner.email as list_owner_email,
      u_owner.name as list_owner_name,
      u_inviter.id as inviting_user_id,
      u_inviter.email as inviting_user_email,
      u_inviter.name as inviting_user_name
    from task_list_invites li
    join task_lists tl on tl.id = li.list_id
    join users u_owner on u_owner.id = tl.user_id
    join users u_inviter on u_inviter.id = li.user_id
    where li.user_id = ${userId}
    order by li.created_at desc, li.id asc
  `);

  return resultRows<ListInviteRow>(result).map((row) => ({
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

  const pendingResult = await db.execute(sql`
    select id
    from task_list_invites
    where list_id = ${params.listId}
      and lower(invited_user_email) = ${normalizedEmail}
      and accepted = false
    limit 1
  `);
  if (resultRows<{ id: string }>(pendingResult)[0]) {
    throw new ConflictError('A pending invite already exists for this user');
  }

  if (invitee) {
    const membershipResult = await db.execute(sql`
      select list_id
      from task_list_collaborators
      where list_id = ${params.listId}
        and user_id = ${invitee.id}
      limit 1
    `);
    if (resultRows<{ list_id: string }>(membershipResult)[0]) {
      throw new ConflictError('This user is already a member of this list');
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  const insertResult = await db.execute(sql`
    insert into task_list_invites (
      list_id,
      user_id,
      invited_user_email,
      invited_user_id,
      accepted,
      token
    )
    values (
      ${params.listId},
      ${params.invitingUserId},
      ${normalizedEmail},
      ${invitee?.id ?? null},
      false,
      ${token}
    )
    returning
      id,
      list_id,
      user_id,
      invited_user_email,
      invited_user_id,
      accepted,
      token,
      accepted_at,
      created_at,
      updated_at
  `);

  const row = resultRows<ListInviteRow>(insertResult)[0] ?? null;
  if (!row) {
    throw new ValidationError('Failed to create list invite');
  }

  return toOutput(row);
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

  const membershipResult = await db.execute(sql`
    insert into task_list_collaborators (list_id, user_id, added_by_user_id)
    values (${invite.list_id}, ${params.acceptingUserId}, ${invite.user_id})
    on conflict (list_id, user_id) do nothing
    returning list_id
  `);
  const createdMembership = resultRows<{ list_id: string }>(membershipResult)[0];
  if (!createdMembership) {
    const existingMembership = await db.execute(sql`
      select list_id
      from task_list_collaborators
      where list_id = ${invite.list_id}
        and user_id = ${params.acceptingUserId}
      limit 1
    `);
    if (!resultRows<{ list_id: string }>(existingMembership)[0]) {
      throw new ConflictError('Failed to create list membership');
    }
  }

  await db.execute(sql`
    update task_list_invites
    set
      invited_user_id = ${params.acceptingUserId},
      accepted = true,
      accepted_at = now(),
      updated_at = now()
    where id = ${invite.id}
  `);

  const listResult = await db.execute(sql`
    select
      tl.id as list_id,
      tl.name as list_name,
      tl.user_id as list_owner_id,
      u_owner.email as list_owner_email,
      u_owner.name as list_owner_name,
      tl.created_at
    from task_lists tl
    join users u_owner on u_owner.id = tl.user_id
    where tl.id = ${invite.list_id}
    limit 1
  `);
  const row = resultRows<ListInviteRow>(listResult)[0] ?? null;
  if (!row) {
    throw new NotFoundError('List not found');
  }

  return toListOutput(row) as ListOutput;
}

export async function deleteListInvite(params: DeleteListInviteParams): Promise<void> {
  await ensureListOwner(params.listId, params.userId);
  const normalizedEmail = params.invitedUserEmail.toLowerCase();
  const result = await db.execute(sql`
    delete from task_list_invites
    where list_id = ${params.listId}
      and lower(invited_user_email) = ${normalizedEmail}
    returning id
  `);
  if (!resultRows<{ id: string }>(result)[0]) {
    throw new NotFoundError('Invite not found');
  }
}
