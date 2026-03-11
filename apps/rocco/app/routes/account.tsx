import { Alert, Form, Inline, PageTitle, Stack } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { LoadingScreen } from '@hominem/ui/loading';
import { UserCircle } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { requireAuth } from '~/lib/guards';
import { useDeleteAccount } from '~/lib/hooks/use-user';

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
  const { isError, mutate } = useDeleteAccount({
    onSuccess: () => {
      return navigate('/login');
    },
  });

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      mutate({});
    },
    [mutate],
  );

  return (
    <>
      {isError && (
        <Alert variant="destructive">
          <span data-testid="delete-account-error">Account delete failed. Retry.</span>
        </Alert>
      )}

      <Form onSubmit={onSubmit}>
        <Button
          data-testid="delete-account-form"
          className="px-4 py-2"
          type="submit"
          variant="destructive"
        >
          Delete account
        </Button>
      </Form>
    </>
  );
}

export default function Account({ loaderData }: Route.ComponentProps) {
  const user = loaderData.user;

  return (
    <div className="h-full overflow-y-auto p-6">
      <Stack gap="lg">
        <PageTitle title="Account" />
        <div className="border border-border p-4 flex flex-col gap-4">
          <Inline gap="md">
            {user.image ? (
              <img src={user.image} alt="user avatar" className="w-16 h-16 object-cover" />
            ) : (
              <UserCircle data-testid="user-circle-icon" size={64} />
            )}
            <Stack gap="none">
              <p className="text-lg font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                <MemberSince createdAt={user.createdAt} />
              </p>
            </Stack>
          </Inline>
        </div>

        <DeleteAccount />
      </Stack>
    </div>
  );
}

import ErrorBoundary from '~/components/ErrorBoundary';
export { ErrorBoundary };

export function HydrateFallback() {
  return <LoadingScreen />;
}
