import { Button } from '@hominem/ui/button';
import { ArrowRight, ListCheck } from 'lucide-react';
import { useCallback } from 'react';
import { Link } from 'react-router';

import type { ReceivedInvite } from '~/lib/types';

import { useAcceptInvite } from '~/lib/hooks/use-invites';

type ReceivedInviteItemProps =
  | {
      variant: 'preview';
      preview: {
        listName: string;
        coverPhoto?: string | null | undefined;
        firstItemName?: string | null | undefined;
        invitedUserEmail?: string | null | undefined;
        onSignIn: () => void;
      };
    }
  | {
      variant?: 'invite' | undefined;
      listInvite: ReceivedInvite;
      currentUserEmail?: string | undefined;
      canAccept?: boolean | undefined;
    };

const ReceivedInviteItem = (props: ReceivedInviteItemProps) => {
  const inviteProps = props.variant !== 'preview' ? props : null;
  const previewProps = props.variant === 'preview' ? props : null;

  const { mutate, isPending } = useAcceptInvite();

  const normalizedUserEmail = inviteProps?.currentUserEmail?.toLowerCase();
  const normalizedInviteEmail = inviteProps?.listInvite.invitedUserEmail?.toLowerCase();
  const isEmailMismatch =
    normalizedUserEmail && normalizedInviteEmail && normalizedUserEmail !== normalizedInviteEmail;

  const onAcceptClick = useCallback(() => {
    if (!inviteProps) {
      return;
    }

    mutate({
      listId: inviteProps.listInvite.listId,
      token: inviteProps.listInvite.token,
    });
  }, [inviteProps, mutate]);

  // Handle preview variant
  if (previewProps) {
    const { preview } = previewProps;
    return (
      <li className="flex flex-col gap-3 p-6 bg-secondary border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <ListCheck className="size-4 text-primary" />
          </div>
          <p className="text-xl font-semibold text-foreground">{preview.listName}</p>
        </div>

        {preview.coverPhoto ? (
          <div className="w-full h-40 bg-muted rounded-md overflow-hidden">
            <img
              src={preview.coverPhoto}
              alt={preview.listName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 rounded-md bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
            No photo yet
          </div>
        )}

        {preview.firstItemName && (
          <p className="text-sm text-muted-foreground">
            First item: <span className="font-medium text-foreground">{preview.firstItemName}</span>
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Sign in to accept this invite{' '}
            {preview.invitedUserEmail ? (
              <span>
                for <span className="text-foreground font-medium">{preview.invitedUserEmail}</span>
              </span>
            ) : (
              'with your account.'
            )}
          </p>
          <Button
            className="px-4 py-2 rounded-lg shadow-sm transition-colors font-medium"
            onClick={preview.onSignIn}
          >
            Continue with Google
          </Button>
        </div>
      </li>
    );
  }

  // Handle invite variant - TypeScript knows inviteProps is not null here
  const { listInvite, canAccept = true } = inviteProps!;
  const { status, list } = listInvite;
  const isAccepted = status === 'accepted';

  return (
    <li className="flex flex-col gap-3 p-6 bg-secondary border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <ListCheck className="size-4 text-primary" />
          </div>
          <p className="text-xl font-semibold text-foreground">{list?.name || 'Unknown List'}</p>
        </div>
        {isAccepted ? (
          <Link
            to={`/lists/${list?.id || listInvite.listId}`}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-hover text-primary-foreground rounded-lg shadow-sm transition-colors font-medium"
          >
            <span>View list</span>
            <ArrowRight size={18} />
          </Link>
        ) : (
          <AcceptButton status={isPending} canAccept={canAccept} onAcceptClick={onAcceptClick} />
        )}
      </div>
      {!isAccepted && isEmailMismatch && (
        <p className="flex flex-col gap-2 text-sm text-muted-foreground">
          <span>
            Invited as{' '}
            <span className="italic text-muted-foreground">{listInvite.invitedUserEmail}</span>
          </span>
          <span>Accepting will attach it to your current Google login.</span>
        </p>
      )}
    </li>
  );
};

export default ReceivedInviteItem;

const AcceptButton = ({
  status,
  canAccept,
  onAcceptClick,
}: {
  status: boolean;
  canAccept: boolean;
  onAcceptClick: () => void;
}) => {
  return (
    <Button
      className="px-4 py-2 rounded-lg shadow-sm transition-colors font-medium"
      disabled={status || !canAccept}
      onClick={onAcceptClick}
    >
      {status ? 'Accepting...' : canAccept ? 'Accept invite' : 'Sign in to accept'}
    </Button>
  );
};
