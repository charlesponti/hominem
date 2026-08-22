import {
  acceptCollaboratorInvite,
  addPlaceToList,
  createPlaceList,
  inviteCollaborator,
  listMyPendingInvites,
  listPlaceLists,
  placeListDetail,
  removePlaceFromList,
} from '../../application/place-lists.service';
import {
  acceptCollaboratorInviteInputSchema,
  acceptCollaboratorInviteOutputSchema,
  addPlaceToListInputSchema,
  addPlaceToListOutputSchema,
  createPlaceListInputSchema,
  createPlaceListOutputSchema,
  inviteCollaboratorInputSchema,
  inviteCollaboratorOutputSchema,
  listPendingInvitesInputSchema,
  listPendingInvitesOutputSchema,
  listPlaceListsInputSchema,
  listPlaceListsOutputSchema,
  placeListDetailInputSchema,
  placeListDetailOutputSchema,
  removePlaceFromListInputSchema,
  removePlaceFromListOutputSchema,
} from '../../schemas/place-lists.schema';
import { registerTool } from '../tools';

registerTool(
  {
    name: 'create_place_list',
    title: 'Create a place list',
    description: 'Create a new list of places you want to go (a travel wishlist).',
    inputSchema: createPlaceListInputSchema,
    outputSchema: createPlaceListOutputSchema,
    readOnly: false,
    scopes: ['placeLists:write'],
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, input) => createPlaceList(ownerUserId, input),
);

registerTool(
  {
    name: 'add_place_to_list',
    title: 'Add a place to a list',
    description:
      'Add a place to a place list, either by an existing place id or by name/address/coordinates.',
    inputSchema: addPlaceToListInputSchema,
    outputSchema: addPlaceToListOutputSchema,
    readOnly: false,
    scopes: ['placeLists:write'],
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, input) => addPlaceToList(ownerUserId, input),
);

registerTool(
  {
    name: 'remove_place_from_list',
    title: 'Remove a place from a list',
    description: 'Remove a place from a place list.',
    inputSchema: removePlaceFromListInputSchema,
    outputSchema: removePlaceFromListOutputSchema,
    readOnly: false,
    scopes: ['placeLists:write'],
    sensitivity: 'standard',
    resultCap: 1,
    requiresConfirmation: true,
    preview: async (ownerUserId, input) => {
      const parsed = removePlaceFromListInputSchema.safeParse(input);
      if (!parsed.success) return null;
      const detail = await placeListDetail(ownerUserId, parsed.data.placeListId);
      const item = detail.items.find((entry) => entry.place.id === parsed.data.placeId);
      return {
        placeList: detail.placeList?.name ?? '(unknown place list)',
        place: item?.place.name ?? '(unknown place)',
      };
    },
  },
  async (ownerUserId, input) => removePlaceFromList(ownerUserId, input),
);

registerTool(
  {
    name: 'list_place_lists',
    title: 'List place lists',
    description: 'List place lists you own or collaborate on, most recently created first.',
    inputSchema: listPlaceListsInputSchema,
    outputSchema: listPlaceListsOutputSchema,
    readOnly: true,
    scopes: ['placeLists:read'],
    sensitivity: 'standard',
    resultCap: 50,
  },
  async (ownerUserId, input) => listPlaceLists(ownerUserId, input),
);

registerTool(
  {
    name: 'place_list_detail',
    title: 'Place list detail',
    description:
      "Get a place list's details: its places (with address and visited status), and collaborators.",
    inputSchema: placeListDetailInputSchema,
    outputSchema: placeListDetailOutputSchema,
    readOnly: true,
    scopes: ['placeLists:read'],
    sensitivity: 'standard',
    resultCap: 100,
  },
  async (ownerUserId, input) => placeListDetail(ownerUserId, input.placeListId),
);

registerTool(
  {
    name: 'invite_place_list_collaborator',
    title: 'Invite a collaborator to a place list',
    description:
      "Invite someone (by email) to collaborate on a place list as an editor or viewer. If they don't have a hominem account yet, the invite is stored and activates automatically once they sign up.",
    inputSchema: inviteCollaboratorInputSchema,
    outputSchema: inviteCollaboratorOutputSchema,
    readOnly: false,
    scopes: ['placeLists:write'],
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, input) => inviteCollaborator(ownerUserId, input),
);

registerTool(
  {
    name: 'accept_place_list_invite',
    title: 'Accept a place list invite',
    description: "Accept the caller's pending invite to collaborate on a place list.",
    inputSchema: acceptCollaboratorInviteInputSchema,
    outputSchema: acceptCollaboratorInviteOutputSchema,
    readOnly: false,
    scopes: ['placeLists:write'],
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, input) => acceptCollaboratorInvite(ownerUserId, input),
);

registerTool(
  {
    name: 'list_pending_invites',
    title: 'List pending place list invites',
    description:
      "List place list invites waiting on the caller's response, most recently invited first.",
    inputSchema: listPendingInvitesInputSchema,
    outputSchema: listPendingInvitesOutputSchema,
    readOnly: true,
    scopes: ['placeLists:read'],
    sensitivity: 'standard',
    resultCap: 50,
  },
  async (ownerUserId, input) => listMyPendingInvites(ownerUserId, input),
);
