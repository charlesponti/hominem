import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import {
  useAcceptCollaborationInvite,
  useCollaborationInvites,
  useDeclineCollaborationInvite,
} from '~/hooks/use-collaboration-invites';

export function CollaborationNotifications() {
  const invites = useCollaborationInvites();
  const acceptInvite = useAcceptCollaborationInvite();
  const declineInvite = useDeclineCollaborationInvite();
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  return (
    <div className="w-80 border-b px-2 py-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-sm">Notifications</h2>
        {invites.count > 0 ? (
          <span className="text-muted-foreground text-xs">{invites.count} pending</span>
        ) : null}
      </div>
      {invites.isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> : null}
      {invites.isError ? (
        <p className="text-destructive text-sm">Could not load notifications.</p>
      ) : null}
      {!invites.isLoading && !invites.isError && invites.invites.length === 0 ? (
        <p className="text-muted-foreground text-sm">You’re all caught up.</p>
      ) : null}
      <ul className="space-y-2">
        {invites.invites.map((invite) => {
          const id = invite.collection.id;
          const name = invite.collection.name;
          const key = id;
          const isAccepted = accepted.has(key);
          const isPending = acceptInvite.isPending && acceptInvite.variables?.id === id;

          return (
            <li className="rounded-md bg-muted/50 p-3" key={key}>
              <div className="mb-2 text-sm">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground"> · invited you as {invite.role}</span>
              </div>
              {isAccepted ? (
                <span className="flex items-center gap-1 text-green-600 text-xs">
                  <CheckCircle2 className="size-3.5" /> Accepted
                </span>
              ) : (
                <div className="flex gap-2">
                  <Button
                    disabled={isPending}
                    onClick={() => {
                      acceptInvite.mutate(
                        { id },
                        { onSuccess: () => setAccepted((current) => new Set(current).add(key)) },
                      );
                    }}
                    size="sm"
                    type="button"
                  >
                    Accept
                  </Button>
                  <Button
                    disabled={declineInvite.isPending}
                    onClick={() => declineInvite.mutate({ id })}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Decline
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
