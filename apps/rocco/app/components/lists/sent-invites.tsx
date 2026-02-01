import { List } from '@hominem/ui/list';

import type { SentInvite } from '~/lib/types';

import InvitesEmptyState from './invites-empty-state';
import SentInviteItem from './sent-invite-item';

type SentInvitesProps = {
  invites: SentInvite[];
  listId: string;
  onInviteDeleted: (email: string) => void;
};

export default function SentInvites({ invites, listId, onInviteDeleted }: SentInvitesProps) {
  if (invites.length === 0) {
    return <InvitesEmptyState />;
  }

  return (
    <List>
      {invites.map((invite) => (
        <SentInviteItem
          key={invite.invitedUserEmail}
          invite={invite}
          listId={listId}
          onDelete={onInviteDeleted}
        />
      ))}
    </List>
  );
}
