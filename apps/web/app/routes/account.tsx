import { Link, data } from 'react-router';

import { Button } from '~/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/card';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/account';

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  return data({ userId: user?.id ?? null });
}

export default function AccountPage() {
  return (
    <main className="container mx-auto w-full px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your account</p>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Manage your session.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border/30 p-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Sign Out</h3>
                <p className="text-sm text-text-secondary">End your current session.</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/logout">Sign Out</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
