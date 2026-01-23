import { invitesService } from '@hominem/invites-services';
import { listsService } from '@hominem/lists-services';
import { Alert, PageTitle } from '@hominem/ui';
import { useEffect, useMemo, useState } from 'react';
import { Link, useRevalidator } from 'react-router';

import type { SentInvite } from '~/lib/types';

import ErrorBoundary from '~/components/ErrorBoundary';
import SentInviteForm from '~/components/lists/sent-invite-form';
import SentInvites from '~/components/lists/sent-invites';

import type { Route } from './+types/lists.$id.invites';

export async function loader({ params }: Route.LoaderArgs) {
  const listId = params.id;
  if (!listId) {
    throw new Response('List ID is required', { status: 400 });
  }

  const [list, invites] = await Promise.all([
    listsService.getById(listId),
    invitesService.getByList({ listId }),
  ]);

  return { list, invites };
}

export default function ListInvites({ loaderData }: Route.ComponentProps) {
  const { list, invites: initialInvites } = loaderData;
  const revalidator = useRevalidator();
  const [optimisticInvites, setOptimisticInvites] = useState<typeof initialInvites | null>(null);

  // Use optimistic state if available, otherwise use loader data
  const invites = useMemo(
    () => optimisticInvites ?? initialInvites ?? [],
    [optimisticInvites, initialInvites],
  );

  // Reset optimistic state when loader data changes (after revalidation)
  useEffect(() => {
    if (initialInvites && optimisticInvites) {
      // If the server data matches our optimistic state, we can clear it
      // Otherwise keep optimistic state until revalidation completes
      const serverEmails = new Set(initialInvites.map((inv) => inv.invitedUserEmail));
      const optimisticEmails = new Set(optimisticInvites.map((inv) => inv.invitedUserEmail));
      const isSynced =
        serverEmails.size === optimisticEmails.size &&
        Array.from(serverEmails).every((email) => optimisticEmails.has(email));
      if (isSynced) {
        setOptimisticInvites(null);
      }
    }
  }, [initialInvites, optimisticInvites]);

  if (!(list && initialInvites)) {
    return <Alert type="error">We could not find this list.</Alert>;
  }

  const handleInviteSuccess = (_newInvite: SentInvite) => {
    // Just trigger revalidation - the mutation already succeeded server-side
    // The new invite will appear when revalidation completes
    // For smoother UX, we could optimistically add it, but the types don't match perfectly
    // between getReceived and getByList responses, so we'll let revalidation handle it
    revalidator.revalidate();
  };

  const handleInviteDeleted = (deletedEmail: string) => {
    // Optimistically remove the invite immediately for smooth UX
    setOptimisticInvites((prev) => {
      const current = prev ?? initialInvites ?? [];
      return current.filter((inv) => inv.invitedUserEmail !== deletedEmail);
    });
    // Revalidate in background to sync with server
    revalidator.revalidate();
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="relative">
        <PageTitle
          title={list.name}
          subtitle="Invitations"
          actions={
            <Link
              to={`/lists/${list.id}`}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              View List
            </Link>
          }
        />
      </div>

      <div className="space-y-2">
        <SentInviteForm listId={list.id} onCreate={handleInviteSuccess} />
        <SentInvites invites={invites} listId={list.id} onInviteDeleted={handleInviteDeleted} />
      </div>
    </div>
  );
}

export { ErrorBoundary };
