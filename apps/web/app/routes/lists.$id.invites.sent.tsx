import { useSupabaseAuthContext } from '@hominem/auth';
import { PageTitle } from '@hominem/ui';
import { Loading } from '@hominem/ui/loading';
import { redirect } from 'react-router';
import ErrorBoundary from '~/components/ErrorBoundary';
import { trpc } from '~/lib/trpc/client';
import { createCaller } from '~/lib/trpc/server';
import type { Route } from './+types/lists.$id.invites.sent';

export async function loader({ request }: Route.LoaderArgs) {
  const trpcServer = createCaller(request);
  const { userId } = useSupabaseAuthContext();
  const data = await trpcServer.invites.getSent();

  if (!userId) {
    return redirect('/');
  }

  return { invites: data };
}

export default function ListSentInvites({ loaderData }: Route.ComponentProps) {
  const { data, isLoading } = trpc.invites.getSent.useQuery(undefined, {
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
