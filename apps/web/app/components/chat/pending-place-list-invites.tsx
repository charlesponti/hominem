import type { PendingPlaceListInvite } from '@hominem/rpc/types';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { useAcceptPlaceListInvite, usePendingPlaceListInvites } from '~/hooks/use-place-lists';

// Renders live inside a completed `list_pending_invites` tool card so the
// user can accept right there — calling the RPC endpoint directly rather
// than asking the model to call accept_place_list_invite, which is a plain
// deterministic action once the list id is known and doesn't need an LLM
// round trip to execute reliably.
export function PendingPlaceListInvites() {
  const { data, isLoading, isError } = usePendingPlaceListInvites();
  const acceptInvite = useAcceptPlaceListInvite();
  // Keyed by placeListId. Kept around after the server list stops
  // returning an accepted invite, so the "Accepted" state stays visible
  // here instead of the row just disappearing on refetch.
  const [accepted, setAccepted] = useState<Map<string, PendingPlaceListInvite>>(new Map());

  if (isLoading && accepted.size === 0) {
    return <p className="text-muted-foreground text-xs">Loading pending invites…</p>;
  }
  if (isError) {
    return null;
  }

  const pending = (data?.invites ?? []).filter((invite) => !accepted.has(invite.placeList.id));
  const rows = [...accepted.values(), ...pending];
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Pending invites
      </h4>
      <ul className="space-y-2">
        {rows.map((invite) => {
          const placeListId = invite.placeList.id;
          const isAccepted = accepted.has(placeListId);
          const isPending =
            acceptInvite.isPending && acceptInvite.variables?.placeListId === placeListId;

          return (
            <li
              className="flex items-center justify-between gap-3 rounded-md bg-muted/50 p-3 text-xs"
              key={placeListId}
            >
              <div>
                <div className="font-medium text-foreground">{invite.placeList.name}</div>
                <div className="text-muted-foreground">Role: {invite.role}</div>
              </div>
              {isAccepted ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="size-3.5" />
                  Accepted
                </span>
              ) : (
                <Button
                  disabled={isPending}
                  onClick={() => {
                    acceptInvite.mutate(
                      { placeListId },
                      {
                        onSuccess: () => {
                          setAccepted((current) => new Map(current).set(placeListId, invite));
                        },
                      },
                    );
                  }}
                  size="sm"
                  type="button"
                >
                  Accept
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
