import { db, pool } from '@hominem/db';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

const ownerId = 'c1000000-0000-4000-8000-000000000001';
const ownerEmail = `${ownerId}@test.hominem.dev`;
const collaboratorId = 'c1000000-0000-4000-8000-000000000002';
const collaboratorEmail = `${collaboratorId}@test.hominem.dev`;
const outsiderId = 'c1000000-0000-4000-8000-000000000003';
const newSignupId = 'c1000000-0000-4000-8000-000000000004';
const newSignupEmail = `${newSignupId}@test.hominem.dev`;

type TestResultContent = Record<string, unknown>;

function resultContent(res: McpToolResult): TestResultContent {
  return res.structuredContent as TestResultContent;
}

beforeAll(async () => {
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [
    [ownerId, collaboratorId, outsiderId, newSignupId],
  ]);
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified") VALUES
       ($1, 'Owner', $2, true),
       ($3, 'Collaborator', $4, true),
       ($5, 'Outsider', $6, true)`,
    [
      ownerId,
      ownerEmail,
      collaboratorId,
      collaboratorEmail,
      outsiderId,
      `${outsiderId}@test.hominem.dev`,
    ],
  );
});

describe('place lists', () => {
  it('lets an owner create a place list, add a place, and read it back', async () => {
    await import('./place-lists');
    const { callTool } = await import('../tools');

    const createRes = await callTool(ownerId, 'create_place_list', { name: 'Japan trip' });
    const created = resultContent(createRes) as { placeList: { id: string; kind: string } };
    expect(created.placeList.kind).toBe('place_list');

    const placeListId = created.placeList.id;

    const addRes = await callTool(ownerId, 'add_place_to_list', {
      placeListId,
      name: 'Kyoto',
      address: 'Kyoto, Japan',
      note: 'temples!',
    });
    const added = resultContent(addRes) as { item: { place: { name: string }; note: string } };
    expect(added.item.place.name).toBe('Kyoto');
    expect(added.item.note).toBe('temples!');

    const detailRes = await callTool(ownerId, 'place_list_detail', { placeListId });
    const detail = resultContent(detailRes) as {
      placeList: { name: string };
      items: Array<{ place: { name: string }; visited: boolean }>;
    };
    expect(detail.placeList.name).toBe('Japan trip');
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0]?.place.name).toBe('Kyoto');
    expect(detail.items[0]?.visited).toBe(false);
  });

  it('excludes place lists from a caller with no access', async () => {
    const { callTool } = await import('../tools');

    const createRes = await callTool(ownerId, 'create_place_list', { name: 'Private list' });
    const created = resultContent(createRes) as { placeList: { id: string } };

    const detailRes = await callTool(outsiderId, 'place_list_detail', {
      placeListId: created.placeList.id,
    });
    const detail = resultContent(detailRes) as { placeList: unknown; items: unknown[] };
    expect(detail.placeList).toBeNull();
    expect(detail.items).toEqual([]);
  });

  it('lets an invited collaborator see and add to a shared place list once accepted', async () => {
    const { callTool } = await import('../tools');

    const createRes = await callTool(ownerId, 'create_place_list', {
      name: 'Shared list',
      visibility: 'shared',
    });
    const created = resultContent(createRes) as { placeList: { id: string } };
    const placeListId = created.placeList.id;

    // Not yet invited: collaborator has no access.
    const beforeInvite = resultContent(
      await callTool(collaboratorId, 'place_list_detail', { placeListId }),
    ) as { placeList: unknown };
    expect(beforeInvite.placeList).toBeNull();

    await callTool(ownerId, 'invite_place_list_collaborator', {
      placeListId,
      email: collaboratorEmail,
      role: 'editor',
    });

    // Invited but not accepted: still no access.
    const beforeAccept = resultContent(
      await callTool(collaboratorId, 'place_list_detail', { placeListId }),
    ) as { placeList: unknown };
    expect(beforeAccept.placeList).toBeNull();

    await callTool(collaboratorId, 'accept_place_list_invite', { placeListId });

    const afterAccept = resultContent(
      await callTool(collaboratorId, 'place_list_detail', { placeListId }),
    ) as { placeList: { name: string } };
    expect(afterAccept.placeList.name).toBe('Shared list');

    const addRes = await callTool(collaboratorId, 'add_place_to_list', {
      placeListId,
      name: 'Lisbon',
    });
    const added = resultContent(addRes) as { item: { place: { name: string } } };
    expect(added.item.place.name).toBe('Lisbon');

    // The owner sees the collaborator's addition too.
    const ownerDetail = resultContent(
      await callTool(ownerId, 'place_list_detail', { placeListId }),
    ) as { items: Array<{ place: { name: string } }> };
    expect(ownerDetail.items.map((item) => item.place.name)).toContain('Lisbon');
  });

  it('reuses an existing place row instead of creating a duplicate', async () => {
    const { callTool } = await import('../tools');

    const listA = resultContent(
      await callTool(ownerId, 'create_place_list', { name: 'Dedup list A' }),
    ) as { placeList: { id: string } };
    const listB = resultContent(
      await callTool(ownerId, 'create_place_list', { name: 'Dedup list B' }),
    ) as { placeList: { id: string } };

    const first = resultContent(
      await callTool(ownerId, 'add_place_to_list', {
        placeListId: listA.placeList.id,
        name: 'Rome',
        address: 'Rome, Italy',
      }),
    ) as { item: { place: { id: string } } };

    const second = resultContent(
      await callTool(ownerId, 'add_place_to_list', {
        placeListId: listB.placeList.id,
        name: 'Rome',
        address: 'Rome, Italy',
      }),
    ) as { item: { place: { id: string } } };

    expect(second.item.place.id).toBe(first.item.place.id);

    const places = await db
      .selectFrom('app.places')
      .select('id')
      .where('ownerUserid', '=', ownerId)
      .where('formattedAddress', '=', 'Rome, Italy')
      .execute();
    expect(places).toHaveLength(1);
  });

  it('adding a place by name only never matches an unrelated existing place', async () => {
    const { callTool } = await import('../tools');

    // An unrelated place the owner already has on file, with no address.
    await db
      .insertInto('app.places')
      .values({ ownerUserid: ownerId, name: 'Unrelated Cafe' })
      .execute();

    const list = resultContent(
      await callTool(ownerId, 'create_place_list', { name: 'Name-only list' }),
    ) as { placeList: { id: string } };

    const added = resultContent(
      await callTool(ownerId, 'add_place_to_list', {
        placeListId: list.placeList.id,
        name: 'Kyoto, Japan',
      }),
    ) as { item: { place: { name: string } } };

    expect(added.item.place.name).toBe('Kyoto, Japan');
  });

  it('invites an email with no hominem account as a pending, activatable invite', async () => {
    const { callTool } = await import('../tools');

    const list = resultContent(
      await callTool(ownerId, 'create_place_list', { name: 'No-account invite list' }),
    ) as { placeList: { id: string } };
    const placeListId = list.placeList.id;

    const inviteRes = resultContent(
      await callTool(ownerId, 'invite_place_list_collaborator', {
        placeListId,
        email: newSignupEmail,
        role: 'editor',
      }),
    ) as { member: { userId: string | null; invitedEmail: string | null; role: string } };
    expect(inviteRes.member.userId).toBeNull();
    expect(inviteRes.member.invitedEmail).toBe(newSignupEmail);
    expect(inviteRes.member.role).toBe('editor');

    // Re-inviting the same pending email is an upsert, not a duplicate row.
    await callTool(ownerId, 'invite_place_list_collaborator', {
      placeListId,
      email: newSignupEmail,
      role: 'viewer',
    });
    const memberRows = await db
      .selectFrom('app.collectionMembers')
      .selectAll()
      .where('collectionId', '=', placeListId)
      .where('invitedEmail', '=', newSignupEmail)
      .execute();
    expect(memberRows).toHaveLength(1);
    expect(memberRows[0]?.role).toBe('viewer');

    // Before the account exists, list_pending_invites for that (not-yet-real) id is meaningless —
    // the invitee only gains access once activatePendingInvitesForUser backfills userId, which
    // happens via the Better Auth signup hook. Simulate that here directly.
    const { activatePendingInvitesForUser } = await import('../../application/collections.service');
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, 'New Signup', $2, true)`,
      [newSignupId, newSignupEmail],
    );
    await activatePendingInvitesForUser(newSignupId, newSignupEmail);

    const pendingRes = resultContent(
      await callTool(newSignupId, 'list_pending_place_list_invites', {}),
    ) as {
      invites: Array<{ placeList: { name: string }; role: string }>;
    };
    expect(pendingRes.invites.map((invite) => invite.placeList.name)).toContain(
      'No-account invite list',
    );

    await callTool(newSignupId, 'accept_place_list_invite', { placeListId });
    const afterAccept = resultContent(
      await callTool(newSignupId, 'place_list_detail', { placeListId }),
    ) as { placeList: { name: string } };
    expect(afterAccept.placeList.name).toBe('No-account invite list');
  });

  it('list_pending_invites excludes owned lists and already-accepted collaborations', async () => {
    const { callTool } = await import('../tools');

    const owned = resultContent(
      await callTool(ownerId, 'create_place_list', { name: 'Owned by collaborator-check' }),
    ) as { placeList: { id: string } };

    const shared = resultContent(
      await callTool(ownerId, 'create_place_list', {
        name: 'Pending-check shared list',
        visibility: 'shared',
      }),
    ) as { placeList: { id: string } };
    await callTool(ownerId, 'invite_place_list_collaborator', {
      placeListId: shared.placeList.id,
      email: collaboratorEmail,
      role: 'viewer',
    });

    const acceptedShared = resultContent(
      await callTool(ownerId, 'create_place_list', {
        name: 'Already-accepted shared list',
        visibility: 'shared',
      }),
    ) as { placeList: { id: string } };
    await callTool(ownerId, 'invite_place_list_collaborator', {
      placeListId: acceptedShared.placeList.id,
      email: collaboratorEmail,
      role: 'viewer',
    });
    await callTool(collaboratorId, 'accept_place_list_invite', {
      placeListId: acceptedShared.placeList.id,
    });

    const pending = resultContent(
      await callTool(collaboratorId, 'list_pending_place_list_invites', {}),
    ) as {
      invites: Array<{ placeList: { id: string; name: string } }>;
    };
    const pendingIds = pending.invites.map((invite) => invite.placeList.id);

    expect(pendingIds).toContain(shared.placeList.id);
    expect(pendingIds).not.toContain(acceptedShared.placeList.id);

    // The owner's own lists are never "pending" for them — their membership
    // row is accepted at creation time.
    const ownerPending = resultContent(
      await callTool(ownerId, 'list_pending_place_list_invites', {}),
    ) as {
      invites: Array<{ placeList: { id: string } }>;
    };
    expect(ownerPending.invites.map((invite) => invite.placeList.id)).not.toContain(
      owned.placeList.id,
    );
  });
});
