import { data } from 'react-router';

import { userContext } from '~/lib/middleware';

import type { Route } from './+types/settings.security';

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  return data({ userId: user?.id ?? null });
}

export default function SecuritySettingsPage() {
  return (
    <main className="container mx-auto w-full px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Security</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage sign-in methods and authentication settings.
        </p>
      </header>
    </main>
  );
}
