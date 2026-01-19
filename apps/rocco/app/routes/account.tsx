import { Alert, PageTitle } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { LoadingScreen } from '@hominem/ui/loading';
import { UserCircle } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { requireAuth } from '~/lib/guards';
import { trpc } from '~/lib/trpc/client';
import type { Route } from './+types/account';

export async function loader(args: Route.LoaderArgs) {
  const authResult = await requireAuth(args.request);

  if (authResult instanceof Response) {
    return authResult;
  }

  return { user: authResult.user };
}

function MemberSince({ createdAt }: { createdAt: string }) {
  const memberSince = new Date(createdAt);
  const timeDiff = Date.now() - memberSince.getTime();
  // Convert milliseconds to years
  const years = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365));
  const month = memberSince.getMonth();
  const year = `${memberSince.getFullYear() + years}`;

  return `Member since ${month}/${year}`;
}

function DeleteAccount() {
  const navigate = useNavigate();
  const { isError, mutate } = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      return navigate('/login');
    },
  });

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      mutate();
    },
    [mutate],
  );

  return (
    <>
      {isError && (
        <Alert type="error">
          <span data-testid="delete-account-error">
            There was an error deleting your account. Please try again.
          </span>
        </Alert>
      )}

      <form onSubmit={onSubmit}>
        <Button
          data-testid="delete-account-form"
          className="px-4 py-2"
          type="submit"
          variant="destructive"
        >
          Delete account
        </Button>
      </form>
    </>
  );
}

export default function Account({ loaderData }: Route.ComponentProps) {
  const user = loaderData.user;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-6">
        <PageTitle title="Account" />
        <div className="border border-border rounded-lg shadow-md p-4 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt="user avatar"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <UserCircle data-testid="user-circle-icon" size={64} />
            )}
            <div className="flex flex-col">
              <p className="text-lg font-medium">{user.name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">
                <MemberSince createdAt={user.createdAt} />
              </p>
            </div>
          </div>
        </div>

        <DeleteAccount />
      </div>
    </div>
  );
}

import ErrorBoundary from '~/components/ErrorBoundary';
export { ErrorBoundary };

export function HydrateFallback() {
  return <LoadingScreen />;
}
