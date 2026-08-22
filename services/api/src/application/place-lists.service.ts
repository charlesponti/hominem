import { db, NotFoundError } from '@hominem/db';

import type {
  AcceptCollaboratorInviteInput,
  AddPlaceToListInput,
  CreatePlaceListInput,
  InviteCollaboratorInput,
  ListPendingInvitesInput,
  ListPlaceListsInput,
  RemovePlaceFromListInput,
} from '../schemas/place-lists.schema';
import {
  acceptMemberInvite,
  addCollectionItem,
  collectionDetail,
  createCollection,
  inviteMember,
  listCollections,
  listPendingInvites,
  removeCollectionItem,
} from './collections.service';
import { findOrCreatePlace } from './places.service';

export async function createPlaceList(ownerUserId: string, input: CreatePlaceListInput) {
  const { collection } = await createCollection(ownerUserId, {
    name: input.name,
    description: input.description,
    visibility: input.visibility,
    kind: 'place_list',
  });
  return { placeList: collection };
}

export async function addPlaceToList(ownerUserId: string, input: AddPlaceToListInput) {
  const placeId = input.placeId
    ? await findOrCreatePlace(ownerUserId, { placeId: input.placeId })
    : await findOrCreatePlace(ownerUserId, {
        name: input.name!,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
      });

  const { item: collectionItem } = await addCollectionItem(ownerUserId, {
    collectionId: input.placeListId,
    entityType: 'places',
    entityId: placeId,
    note: input.note,
  });

  const place = (await loadPlace(placeId)) ?? unknownPlace(placeId);
  const visited = await hasVisited(ownerUserId, placeId);

  return {
    item: { place, note: collectionItem.note, visited, addedAt: collectionItem.addedAt },
  };
}

export async function removePlaceFromList(ownerUserId: string, input: RemovePlaceFromListInput) {
  return removeCollectionItem(ownerUserId, {
    collectionId: input.placeListId,
    entityType: 'places',
    entityId: input.placeId,
  });
}

export async function listPlaceLists(ownerUserId: string, input: ListPlaceListsInput) {
  const { collections, count } = await listCollections(ownerUserId, {
    kind: 'place_list',
    limit: input.limit,
  });
  return { placeLists: collections, count };
}

export async function placeListDetail(ownerUserId: string, placeListId: string) {
  const detail = await collectionDetail(ownerUserId, placeListId);
  if (detail.collection && detail.collection.kind !== 'place_list') {
    throw new NotFoundError('Place list', { placeListId });
  }

  const placeItems = detail.items.filter((item) => item.entityType === 'places');
  const items = await Promise.all(
    placeItems.map(async (item) => {
      const place = (await loadPlace(item.entityId)) ?? unknownPlace(item.entityId);
      const visited = await hasVisited(ownerUserId, item.entityId);
      return { place, note: item.note, visited, addedAt: item.addedAt };
    }),
  );

  return { placeList: detail.collection, items, members: detail.members };
}

export async function inviteCollaborator(ownerUserId: string, input: InviteCollaboratorInput) {
  return inviteMember(ownerUserId, {
    collectionId: input.placeListId,
    email: input.email,
    role: input.role,
  });
}

export async function acceptCollaboratorInvite(
  ownerUserId: string,
  input: AcceptCollaboratorInviteInput,
) {
  return acceptMemberInvite(ownerUserId, { collectionId: input.placeListId });
}

export async function listMyPendingInvites(ownerUserId: string, input: ListPendingInvitesInput) {
  const { invites, count } = await listPendingInvites(ownerUserId, {
    kind: 'place_list',
    limit: input.limit,
  });
  return {
    invites: invites.map((invite) => ({
      placeList: invite.collection,
      role: invite.role,
      invitedAt: invite.invitedAt,
    })),
    count,
  };
}

function unknownPlace(placeId: string) {
  return { id: placeId, name: '(unknown place)', address: null, latitude: null, longitude: null };
}

async function loadPlace(placeId: string) {
  const row = await db
    .selectFrom('app.places')
    .select(['id', 'name', 'formattedAddress', 'latitude', 'longitude'])
    .where('id', '=', placeId)
    .executeTakeFirst();
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.formattedAddress,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
  };
}

async function hasVisited(ownerUserId: string, placeId: string): Promise<boolean> {
  const row = await db
    .selectFrom('app.placeVisits')
    .select('id')
    .where('ownerUserid', '=', ownerUserId)
    .where('placeId', '=', placeId)
    .executeTakeFirst();
  return row !== undefined;
}
