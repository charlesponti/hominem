import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendInviteEmail } from '../resend'
import { db } from '../db'
import { list, users, item as itemTable, userLists } from '../db/schema'
import {
  acceptListInvite,
  getOwnedLists,
  getUserLists,
  getOwnedListsWithItemCount,
  getUserListsWithItemCount,
  sendListInvite,
  deleteListInvite,
} from './lists.service'
import { and, eq } from 'drizzle-orm'
import { createTestUser } from '../fixtures'
import { listInvite } from '../db/schema/lists.schema'

vi.mock('../resend', () => ({
  sendInviteEmail: vi.fn(),
}))

// Helper to check if DB is available; skip tests if not
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.select().from(users).limit(1)
    return true
  } catch {
    console.warn(
      'Database not available, skipping lists.service tests. Start test database on port 4433.'
    )
    return false
  }
}

const dbAvailable = await isDatabaseAvailable()

describe.skipIf(!dbAvailable)('lists.service', () => {
  const ownerId = crypto.randomUUID()
  const sharedUserId = crypto.randomUUID()
  const listId = crypto.randomUUID()
  const inviteListId = crypto.randomUUID()
  const inviteeUserId = crypto.randomUUID()
  const invitedEmail = 'invitee@icloud.com'
  const inviteeGoogleEmail = 'invitee@gmail.com'

  beforeEach(async () => {
    vi.clearAllMocks()

    await createTestUser({ id: ownerId, name: 'Owner' })
    await createTestUser({ id: sharedUserId, name: 'Shared User' })
    await createTestUser({ id: inviteeUserId, name: 'Invitee', email: inviteeGoogleEmail })

    // Create a list for owner
    await db
      .insert(list)
      .values({ id: listId, name: 'Test List', userId: ownerId })
      .onConflictDoNothing()
    await db
      .insert(list)
      .values({ id: inviteListId, name: 'Invite List', userId: ownerId })
      .onConflictDoNothing()

    // Share the list with the shared user
    await db.insert(userLists).values({ listId, userId: sharedUserId }).onConflictDoNothing()
  })

  it('getOwnedLists should return lists owned by user (metadata only)', async () => {
    const owned = await getOwnedLists(ownerId)
    const found = owned.find((l) => l.id === listId)
    expect(found).toBeDefined()
    expect(found?.itemCount).toBeUndefined()
  })

  it('sends an invite email when base URL is configured', async () => {
    const sendInviteEmailMock = vi.mocked(sendInviteEmail)
    const originalBaseUrl = process.env.APP_BASE_URL
    process.env.APP_BASE_URL = 'https://app.example.com'

    try {
      const invite = await sendListInvite(inviteListId, invitedEmail, ownerId)
      if ('error' in invite) {
        expect.fail(`Expected invite to be created, got error ${invite.error}`)
      }

      expect(sendInviteEmailMock).toHaveBeenCalledTimes(1)
      expect(sendInviteEmailMock).toHaveBeenCalledWith({
        to: invitedEmail,
        listName: 'Invite List',
        inviteLink: `https://app.example.com/invites?token=${invite.token}&listId=${inviteListId}`,
      })
    } finally {
      process.env.APP_BASE_URL = originalBaseUrl
    }
  })

  it('allows the list owner to delete a pending invite', async () => {
    const invite = await sendListInvite(inviteListId, invitedEmail, ownerId)
    if ('error' in invite) {
      expect.fail(`Expected invite to be created, got error ${invite.error}`)
    }

    const result = await deleteListInvite({
      listId: inviteListId,
      invitedUserEmail: invitedEmail,
      userId: ownerId,
    })

    expect(result).toEqual({ success: true })

    const inviteRecord = await db.query.listInvite.findFirst({
      where: and(eq(listInvite.listId, inviteListId), eq(listInvite.token, invite.token)),
    })

    expect(inviteRecord).toBeUndefined()
  })

  it('prevents deleting an invite that was already accepted', async () => {
    const invite = await sendListInvite(inviteListId, invitedEmail, ownerId)
    if ('error' in invite) {
      expect.fail(`Expected invite to be created, got error ${invite.error}`)
    }

    // Accept the invite to mark it as accepted
    const accepted = await acceptListInvite(inviteListId, inviteeUserId, invite.token)
    if ('error' in accepted) {
      expect.fail(`Expected invite to be accepted, got error ${accepted.error}`)
    }

    const result = await deleteListInvite({
      listId: inviteListId,
      invitedUserEmail: invitedEmail,
      userId: ownerId,
    })

    expect(result).toEqual({
      error: 'Invite has already been accepted and cannot be deleted.',
      status: 400,
    })
  })

  it('getUserLists should return lists shared with user (metadata only)', async () => {
    const shared = await getUserLists(sharedUserId)
    const found = shared.find((l) => l.id === listId)
    expect(found).toBeDefined()
    expect(found?.itemCount).toBeUndefined()
  })

  it('getOwnedListsWithItemCount should return counts for items in owned lists', async () => {
    // Insert a couple of items for the list
    const item1 = {
      id: crypto.randomUUID(),
      type: 'PLACE',
      itemId: crypto.randomUUID(),
      listId,
      userId: ownerId,
    }
    const item2 = {
      id: crypto.randomUUID(),
      type: 'PLACE',
      itemId: crypto.randomUUID(),
      listId,
      userId: ownerId,
    }
    await db.insert(itemTable).values([item1, item2]).onConflictDoNothing()

    const owned = await getOwnedListsWithItemCount(ownerId)
    const found = owned.find((l) => l.id === listId)
    expect(found).toBeDefined()
    expect(found?.itemCount).toBe(2)
  })

  it('getUserListsWithItemCount should return counts for items in shared lists', async () => {
    // Insert items
    const item1 = {
      id: crypto.randomUUID(),
      type: 'PLACE',
      itemId: crypto.randomUUID(),
      listId,
      userId: ownerId,
    }
    await db.insert(itemTable).values(item1).onConflictDoNothing()

    const shared = await getUserListsWithItemCount(sharedUserId)
    const found = shared.find((l) => l.id === listId)
    expect(found).toBeDefined()
    expect(found?.itemCount).toBe(1)
  })

  it('acceptListInvite allows invite email to differ from signed-in email', async () => {
    const invite = await sendListInvite(inviteListId, invitedEmail, ownerId)
    if ('error' in invite) {
      expect.fail(`Expected invite to be created, got error ${invite.error}`)
    }

    const accepted = await acceptListInvite(inviteListId, inviteeUserId, invite.token)
    if ('error' in accepted) {
      expect.fail(`Expected invite to be accepted, got error ${accepted.error}`)
    }

    expect(accepted.id).toBe(inviteListId)

    const inviteRecord = await db.query.listInvite.findFirst({
      where: and(eq(listInvite.listId, inviteListId), eq(listInvite.token, invite.token)),
    })

    expect(inviteRecord?.accepted).toBe(true)
    expect(inviteRecord?.invitedUserId).toBe(inviteeUserId)

    const membership = await db.query.userLists.findFirst({
      where: and(eq(userLists.listId, inviteListId), eq(userLists.userId, inviteeUserId)),
    })

    expect(membership).toBeTruthy()
  })

  it('rejects accepting an invite already bound to another user', async () => {
    const otherUserId = crypto.randomUUID()
    const otherEmail = 'other-user@example.com'
    await createTestUser({ id: otherUserId, email: otherEmail })

    const invite = await sendListInvite(inviteListId, otherEmail, ownerId)
    if ('error' in invite) {
      expect.fail(`Expected invite to be created, got error ${invite.error}`)
    }

    const response = await acceptListInvite(inviteListId, inviteeUserId, invite.token)

    expect('error' in response).toBe(true)
    if ('error' in response) {
      expect(response.status).toBe(403)
    }

    await db
      .delete(users)
      .where(eq(users.id, otherUserId))
      .catch(() => {})
  })

  it('rejects accepting with an invalid token', async () => {
    const invite = await sendListInvite(inviteListId, invitedEmail, ownerId)
    if ('error' in invite) {
      expect.fail(`Expected invite to be created, got error ${invite.error}`)
    }

    const response = await acceptListInvite(inviteListId, inviteeUserId, 'invalid-token')
    expect('error' in response).toBe(true)
    if ('error' in response) {
      expect(response.status).toBe(404)
    }
  })

  it('rejects double acceptance with the same token', async () => {
    const invite = await sendListInvite(inviteListId, invitedEmail, ownerId)
    if ('error' in invite) {
      expect.fail(`Expected invite to be created, got error ${invite.error}`)
    }

    const first = await acceptListInvite(inviteListId, inviteeUserId, invite.token)
    if ('error' in first) {
      expect.fail(`Expected first accept to succeed, got error ${first.error}`)
    }

    const second = await acceptListInvite(inviteListId, inviteeUserId, invite.token)
    expect('error' in second).toBe(true)
    if ('error' in second) {
      expect(second.status).toBe(400)
    }
  })

  it('decline requires the correct token', async () => {
    const invite = await sendListInvite(inviteListId, invitedEmail, ownerId)
    if ('error' in invite) {
      expect.fail(`Expected invite to be created, got error ${invite.error}`)
    }

    const wrongDelete = await db
      .delete(listInvite)
      .where(and(eq(listInvite.listId, inviteListId), eq(listInvite.token, 'not-the-token')))
      .returning()

    expect(wrongDelete.length).toBe(0)

    const correctDelete = await db
      .delete(listInvite)
      .where(and(eq(listInvite.listId, inviteListId), eq(listInvite.token, invite.token)))
      .returning()

    expect(correctDelete.length).toBe(1)
  })
})
