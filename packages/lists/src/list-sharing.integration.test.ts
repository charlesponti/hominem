import { db, sql } from '@hominem/db'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  acceptListInvite,
  getInvitesForUser,
  getListInvites,
  getOutboundInvites,
  getUserListLinks,
  isUserMemberOfList,
  removeUserFromList,
  sendListInvite,
} from './index'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('lists.sharing.integration.user')
const nextListId = createDeterministicIdFactory('lists.sharing.integration.list')

describe.skipIf(!dbAvailable)('list sharing integration', () => {
  let ownerId: string
  let collaboratorId: string
  let listId: string
  let collaboratorEmail: string

  const cleanupForUsers = async (userIds: string[]): Promise<void> => {
    for (const userId of userIds) {
      await db.execute(sql`delete from task_list_invites where user_id = ${userId}`).catch(() => {})
      await db.execute(
        sql`delete from task_list_invites where invited_user_id = ${userId} or lower(invited_user_email) = lower(${`${userId}@example.com`})`,
      ).catch(() => {})
      await db.execute(
        sql`delete from task_list_collaborators where user_id = ${userId} or added_by_user_id = ${userId}`,
      ).catch(() => {})
      await db.execute(sql`delete from tasks where user_id = ${userId}`).catch(() => {})
      await db.execute(sql`delete from task_lists where user_id = ${userId}`).catch(() => {})
      await db.execute(sql`delete from users where id = ${userId}`).catch(() => {})
    }
  }

  beforeEach(async () => {
    ownerId = nextUserId()
    collaboratorId = nextUserId()
    listId = nextListId()
    collaboratorEmail = `${collaboratorId}@example.com`

    await cleanupForUsers([ownerId, collaboratorId])
    await ensureIntegrationUsers([
      { id: ownerId, name: 'List Sharing User', email: `${ownerId}@example.com` },
      { id: collaboratorId, name: 'List Sharing User', email: collaboratorEmail },
    ])

    await db.execute(sql`
      insert into task_lists (id, user_id, name)
      values (${listId}, ${ownerId}, ${'Shared List'})
    `)
  })

  it('creates pending invite and exposes outbound/inbound queries', async () => {
    const invite = await sendListInvite({
      listId,
      invitedUserEmail: collaboratorEmail.toUpperCase(),
      invitingUserId: ownerId,
      baseUrl: 'https://app.example.com',
    })

    expect(invite.listId).toBe(listId)
    expect(invite.userId).toBe(ownerId)
    expect(invite.invitedUserEmail).toBe(collaboratorEmail)
    expect(invite.accepted).toBe(false)
    expect(invite.invitedUserId).toBe(collaboratorId)

    const listInvites = await getListInvites(listId)
    expect(listInvites).toHaveLength(1)
    expect(listInvites[0]?.token).toBe(invite.token)

    const outbound = await getOutboundInvites(ownerId)
    expect(outbound).toHaveLength(1)
    expect(outbound[0]?.token).toBe(invite.token)

    const inbound = await getInvitesForUser(collaboratorId, collaboratorEmail)
    expect(inbound).toHaveLength(1)
    expect(inbound[0]?.token).toBe(invite.token)
  })

  it('accepts invite, creates membership, and allows owner removal', async () => {
    const invite = await sendListInvite({
      listId,
      invitedUserEmail: collaboratorEmail,
      invitingUserId: ownerId,
      baseUrl: 'https://app.example.com',
    })

    expect(await isUserMemberOfList(listId, collaboratorId)).toBe(false)

    await acceptListInvite({
      listId,
      acceptingUserId: collaboratorId,
      token: invite.token,
    })

    expect(await isUserMemberOfList(listId, collaboratorId)).toBe(true)

    const links = await getUserListLinks([listId])
    const users = new Set(links.map((link) => link.userId))
    expect(users.has(ownerId)).toBe(true)
    expect(users.has(collaboratorId)).toBe(true)

    const removed = await removeUserFromList({
      listId,
      userIdToRemove: collaboratorId,
      ownerId,
    })
    expect('error' in removed).toBe(false)
    expect(await isUserMemberOfList(listId, collaboratorId)).toBe(false)
  })

  it('rejects unauthorized and invalid collaborator removal actions', async () => {
    const invite = await sendListInvite({
      listId,
      invitedUserEmail: collaboratorEmail,
      invitingUserId: ownerId,
      baseUrl: 'https://app.example.com',
    })

    await acceptListInvite({
      listId,
      acceptingUserId: collaboratorId,
      token: invite.token,
    })

    const nonOwnerRemove = await removeUserFromList({
      listId,
      userIdToRemove: collaboratorId,
      ownerId: collaboratorId,
    })
    expect(nonOwnerRemove).toEqual({
      error: 'List not found or you do not own this list.',
      status: 403,
    })

    const removeOwner = await removeUserFromList({
      listId,
      userIdToRemove: ownerId,
      ownerId,
    })
    expect(removeOwner).toEqual({
      error: 'Cannot remove the list owner.',
      status: 400,
    })
  })
})
