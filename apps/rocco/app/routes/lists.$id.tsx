import { useAuthContext } from '@hominem/auth';
import { Alert, PageTitle } from '@hominem/ui';
import { Loading } from '@hominem/ui/loading';
import { UserPlus } from 'lucide-react';
import { useMemo } from 'react';
import { Link, redirect, useViewTransitionState } from 'react-router';

import type { PlaceLocation } from '~/lib/types';
import type { ListUser } from '@hominem/hono-rpc/types/lists.types';

import ErrorBoundary from '~/components/ErrorBoundary';
import ListEditButton from '~/components/lists/list-edit-button';
import LazyMap from '~/components/map.lazy';
import PlacesList from '~/components/places/places-list';
import UserAvatar from '~/components/user-avatar';
import { MapInteractionProvider } from '~/contexts/map-interaction-context';
import { useGeolocation } from '~/hooks/useGeolocation';
import { requireAuth } from '~/lib/guards';
import { useListById } from '~/lib/hooks/use-lists';
import { createServerHonoClient } from '~/lib/api.server';

import type { Route } from './+types/lists.$id';

export async function loader({ request, params }: Route.LoaderArgs) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  const { id } = params;
  if (!id) {
    return redirect('/404');
  }

  const client = createServerHonoClient(authResult.session?.access_token, request);
  const res = await client.api.lists.get.$post({ json: { id } });
  if (!res.ok) {
    return redirect('/404');
  }

  const list = await res.json();
  if (!list) {
    return redirect('/404');
  }

  return { list };
}

export default function ListPage({ loaderData }: Route.ComponentProps) {
  const { user } = useAuthContext();

  const listId = loaderData.list.id;

  const isTransitioning = useViewTransitionState(`/lists/${listId}`);

  const {
    data: result,
    isLoading,
    error,
  } = useListById(listId, {
    initialData: loaderData.list,
    staleTime: 1000 * 60,
  });

  const list = result ?? loaderData.list;
  const { currentLocation, isLoading: isLoadingLocation } = useGeolocation();

  const places = list.places || []; // Ensure places is an array

  const markers: PlaceLocation[] = useMemo(
    () =>
      places
        .filter((p: { latitude: number | null; longitude: number | null; id: string; name: string; imageUrl: string | null }) => p.latitude != null && p.longitude != null)
        .map((p: { latitude: number | null; longitude: number | null; id: string; name: string; imageUrl: string | null }) => ({
          latitude: p.latitude as number,
          longitude: p.longitude as number,
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
        })),
    [places],
  );

  // Show loading state only on initial load or during view transition
  if ((isLoading && !result) || isTransitioning) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loading size="lg" />
      </div>
    );
  }

  // Use optional chaining and default to check ownership
  const ownerId = 'ownerId' in list ? list.ownerId : (list as { userId?: string }).userId;
  const isOwner = ownerId === user?.id;
  const hasAccess = 'hasAccess' in list ? (list.hasAccess as boolean) : isOwner;
  const collaborators = 'collaborators' in list ? list.collaborators : (list as { users?: unknown[] }).users || [];

  return (
    <div className="space-y-4">
      <div className="flex-1 space-y-2">
        {error && (
          <Alert type="error" dismissible>
            Error loading list updates: {error?.message}
          </Alert>
        )}
        <div
          className="flex justify-between items-center"
          style={{ viewTransitionName: `list-title-${list.id}` }}
        >
          <PageTitle title={list.name} />
          {isOwner && (
            <div className="flex items-center gap-2">
              <Link to={`/lists/${list.id}/invites`} className="flex items-center gap-2">
                <UserPlus size={18} />
              </Link>
              <ListEditButton list={list} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* <ListVisibilityBadge isPublic={data.isPublic} /> */}
            {collaborators && collaborators.length > 0 && (
            <div className="flex items-center -space-x-2">
              {collaborators.slice(0, 5).map((collaborator: ListUser) => (
                <UserAvatar
                  key={collaborator.id}
                  id={collaborator.id}
                  name={collaborator.name}
                  email={collaborator.email}
                  image={collaborator.image}
                  size="sm"
                />
              ))}
              {collaborators.length > 5 && (
                <div className="flex size-6 items-center justify-center border-2 border-border text-xs">
                  +{collaborators.length - 5}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MapInteractionProvider>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="overflow-y-auto space-y-4 pb-8">
            <PlacesList places={places} listId={list.id} canAdd={hasAccess} />
          </div>

          <div className="min-h-[300px] overflow-hidden">
            <LazyMap
              isLoadingCurrentLocation={isLoadingLocation}
              currentLocation={currentLocation}
              zoom={12}
              markers={markers}
            />
          </div>
        </div>
      </MapInteractionProvider>
    </div>
  );
}

export { ErrorBoundary };
