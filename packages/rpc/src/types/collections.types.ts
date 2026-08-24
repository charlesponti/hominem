export type CollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  visibility: 'private' | 'shared';
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PendingCollectionInvite = {
  collection: CollectionSummary;
  role: 'owner' | 'editor' | 'viewer';
  invitedAt: string;
};

export type ListPendingCollectionInvitesOutput = {
  invites: PendingCollectionInvite[];
  count: number;
};

export type AcceptCollectionInviteOutput = {
  member: {
    userId: string | null;
    invitedEmail: string | null;
    role: 'owner' | 'editor' | 'viewer';
    invitedAt: string;
    acceptedAt: string | null;
  };
};
