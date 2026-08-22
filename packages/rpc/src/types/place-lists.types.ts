export type PlaceListSummary = {
  id: string;
  name: string;
  description: string | null;
  visibility: 'private' | 'shared';
  kind: 'generic' | 'place_list';
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PendingPlaceListInvite = {
  placeList: PlaceListSummary;
  role: 'owner' | 'editor' | 'viewer';
  invitedAt: string;
};

export type ListPendingInvitesOutput = {
  invites: PendingPlaceListInvite[];
  count: number;
};

export type PlaceListMember = {
  userId: string | null;
  invitedEmail: string | null;
  role: 'owner' | 'editor' | 'viewer';
  invitedAt: string;
  acceptedAt: string | null;
};

export type AcceptPlaceListInviteOutput = {
  member: PlaceListMember;
};
