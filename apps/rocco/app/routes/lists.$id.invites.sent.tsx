import { useSupabaseAuthContext } from '@hominem/auth';
import { PageTitle } from '@hominem/ui';
import { Loading } from '@hominem/ui/loading';
import { redirect } from 'react-router';

import ErrorBoundary from '~/components/ErrorBoundary';
import { useSentInvites } from '~/lib/hono';

import type { Route } from './+types/lists.$id.invites.sent';

export async function loader(_args: Route.LoaderArgs) {
  const { userId } = useSupabaseAuthContext();

  if (!userId) {
    return redirect('/');
  }

  return { invites: null };
}

export default function ListSentInvites({ loaderData }: Route.ComponentProps) {
  const { data: invitesData, isLoading } = useSentInvites();
  const invites = invitesData?.success ? invitesData.data : [];

  return (
    <>
      <PageTitle title="Sent Invites" />
      <div>
        {isLoading && <Loading />}
        {invites?.length === 0 && 'Your invites will appear here.'}
        {invites && invites.length > 0 && (
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li key={invite.listId} className="card shadow-md p-4">
                <p>
                  <span className="font-semibold mr-2">List ID:</span>
                  {invite.listId}
                </p>
                <p>
                  <span className="font-semibold mr-2">User:</span>
                  {invite.invitedUserEmail}
                </p>
                <p>
                  <span className="font-semibold mr-2">Accepted:</span>
                  {invite.status === 'accepted' ? 'Accepted ✅' : 'Awaiting acceptance ⏳'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export { ErrorBoundary };
