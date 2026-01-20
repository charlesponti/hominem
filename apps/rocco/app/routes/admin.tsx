import { Button } from '@hominem/ui/button';
import { useState } from 'react';
import { redirect } from 'react-router';

import { trpc } from '~/lib/trpc/client';

import type { Route } from './+types/admin';

import { getServerSession } from '../lib/auth.server';

type RefreshResult = {
  updatedCount: number;
  duration: number;
  errors?: unknown;
};

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await getServerSession(request);

  if (!user?.isAdmin) {
    return redirect('/');
  }

  return null;
}

export default function AdminRoute() {
  const [result, setResult] = useState<null | RefreshResult>(null);
  const [loading, setLoading] = useState(false);
  const refreshMutation = trpc.admin.refreshGooglePlaces.useMutation();

  const handleRefresh = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await refreshMutation.mutateAsync({});
      setResult(res);
    } catch (e) {
      setResult({ updatedCount: 0, duration: 0, errors: e });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold">Admin Maintenance</h1>
      <Button onClick={handleRefresh} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh Google Maps Places'}
      </Button>
      {result && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <div>Updated: {result.updatedCount}</div>
          <div>Duration: {result.duration}ms</div>
          {result.errors ? (
            <div className="text-red-600">Error: {String(result.errors)}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
