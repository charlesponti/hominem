import { useSupabaseAuthContext } from '@hominem/auth';
import { invitesService } from '@hominem/invites-services';
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

  const data = await invitesService.getSent();

  return { invites: data };
}

export default function ListSentInvites({ loaderData }: Route.ComponentProps) {
  const { data, isLoading } = useSentInvites(undefined, {
    initialData: loaderData.invites,
  });

  return (
    <>
      <PageTitle title="Sent Invites" />
      <div>
        {isLoading && <Loading />}
        {data?.length === 0 && 'Your invites will appear here.'}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((invite) => (
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
                  {invite.accepted ? 'Accepted ✅' : 'Awaiting acceptance ⏳'}
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
