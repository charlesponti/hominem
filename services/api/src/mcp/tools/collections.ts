import * as z from 'zod';

import {
  addCollectionItem,
  acceptMemberInvite,
  collectionDetail,
  createCollection,
  inviteMember,
  listCollections,
  removeCollectionItem,
} from '../../application/collections.service';
import {
  acceptMemberInviteInputSchema,
  acceptMemberInviteOutputSchema,
  addCollectionItemInputSchema,
  addCollectionItemOutputSchema,
  collectionDetailInputSchema,
  collectionDetailOutputSchema,
  createCollectionInputSchema,
  createCollectionOutputSchema,
  inviteMemberInputSchema,
  inviteMemberOutputSchema,
  listCollectionsInputSchema,
  listCollectionsOutputSchema,
  removeCollectionItemInputSchema,
  removeCollectionItemOutputSchema,
} from '../../schemas/collections.schema';
import { registerTool } from '../tools';

registerTool(
  {
    name: 'create_collection',
    title: 'Create a collection',
    description:
      'Create a new collection for grouping entities (places, people, possessions).',
    inputSchema: createCollectionInputSchema,
    outputSchema: createCollectionOutputSchema,
    readOnly: false,
    scopes: ['collections:write'],
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, input) => createCollection(ownerUserId, input) as Promise<z.output<typeof createCollectionOutputSchema>>,
);

registerTool(
  {
    name: 'add_collection_item',
    title: 'Add item to collection',
    description:
      'Add an entity (person, place, possession) to a collection with an optional note.',
    inputSchema: addCollectionItemInputSchema,
    outputSchema: addCollectionItemOutputSchema,
    readOnly: false,
    scopes: ['collections:write'],
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, input) => addCollectionItem(ownerUserId, input),
);

registerTool(
  {
    name: 'remove_collection_item',
    title: 'Remove item from collection',
    description: 'Remove an entity from a collection.',
    inputSchema: removeCollectionItemInputSchema,
    outputSchema: removeCollectionItemOutputSchema,
    readOnly: false,
    scopes: ['collections:write'],
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, input) => removeCollectionItem(ownerUserId, input),
);

registerTool(
  {
    name: 'invite_member',
    title: 'Invite member to collection',
    description:
      'Invite a person to collaborate on a collection as an editor or viewer.',
    inputSchema: inviteMemberInputSchema,
    outputSchema: inviteMemberOutputSchema,
    readOnly: false,
    scopes: ['collections:write'],
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, input) => inviteMember(ownerUserId, input),
);

registerTool(
  {
    name: 'accept_member_invite',
    title: 'Accept collection invite',
    description: 'Mark a pending member invite on a collection as accepted.',
    inputSchema: acceptMemberInviteInputSchema,
    outputSchema: acceptMemberInviteOutputSchema,
    readOnly: false,
    scopes: ['collections:write'],
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, input) => acceptMemberInvite(ownerUserId, input),
);

registerTool(
  {
    name: 'list_collections',
    title: 'List collections',
    description: 'List your collections, most recently created first.',
    inputSchema: listCollectionsInputSchema,
    outputSchema: listCollectionsOutputSchema,
    readOnly: true,
    scopes: ['collections:read'],
    sensitivity: 'standard',
    resultCap: 50,
  },
  async (ownerUserId, input) => listCollections(ownerUserId, input),
);

registerTool(
  {
    name: 'collection_detail',
    title: 'Collection detail',
    description: "Get a collection's details, items, and members.",
    inputSchema: collectionDetailInputSchema,
    outputSchema: collectionDetailOutputSchema,
    readOnly: true,
    scopes: ['collections:read'],
    sensitivity: 'standard',
    resultCap: 100,
  },
  async (ownerUserId, input) => collectionDetail(ownerUserId, input.collectionId),
);
