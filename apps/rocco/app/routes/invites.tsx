import { useSupabaseAuthContext } from '@hominem/auth';
import { invitesService } from '@hominem/invites-services';
import { PageTitle } from '@hominem/ui';
import { List } from '@hominem/ui/list';
import { Loading } from '@hominem/ui/loading';
import { Mail } from 'lucide-react';
import { useCallback } from 'react';
import { data } from 'react-router';

import type { ReceivedInvite } from '~/lib/types';

import ReceivedInviteItem from '~/components/ReceivedInviteItem';
import { getAuthState, getServerSession } from '~/lib/auth.server';
import { env } from '~/lib/env';
import { buildInvitePreview } from '~/lib/services/invite-preview.server';

import type { Route } from './+types/invites';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || undefined;

  const { isAuthenticated, headers } = await getAuthState(request);

  // If not authenticated, allow viewing the page and return preview data when possible
  if (!isAuthenticated) {
    const preview = token ? await buildInvitePreview(token) : null;

    return data(
      {
        invites: [],
        tokenMismatch: false,
        requiresAuth: true,
        preview,
      },
      { headers },
    );
  }

  // Get user for authenticated flow
  const { user } = await getServerSession(request);
  if (!user) {
    return data(
      {
        invites: [],
        tokenMismatch: false,
        requiresAuth: true,
        preview: null,
      },
      { headers },
    );
  }

  // Authenticated flow: fetch invites via service
  const invites = await invitesService.getReceived(user.id, token ? { token } : undefined);

  // Check if token belongs to another user
  const tokenMismatch = token
    ? Boolean(invites.find((invite) => invite.token === token)?.belongsToAnotherUser)
    : false;

  return data({ invites, tokenMismatch, requiresAuth: false, preview: null }, { headers });
}

export function meta(args: Route.MetaArgs) {
  const loaderData = args.loaderData;
  const preview = loaderData?.preview;

  // Build URL
  const fullPath = args.location.pathname + args.location.search;
  const url = new URL(fullPath, env.VITE_APP_BASE_URL);

  // Default meta tags
  const defaultTags = [
    { title: 'List Invites - Rocco' },
    { name: 'description', content: 'View and accept list invitations' },
  ];

  // If we have preview data, add Open Graph tags for rich link previews
  if (preview) {
    const title = `You're invited to "${preview.listName}"`;
    const description = preview.firstItemName
      ? `Join this list featuring ${preview.firstItemName} and more`
      : `Join "${preview.listName}" on Rocco`;

    const tags = [
      { title },
      { name: 'description', content: description },
      // Open Graph tags
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url.href },
      // Twitter Card tags (also helps with some platforms)
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    if (preview.coverPhoto) {
      const imageUrl = preview.coverPhoto;

      tags.push(
        { property: 'og:image', content: imageUrl },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:image', content: imageUrl },
      );
    }

    return tags;
  }

  return defaultTags;
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loading size="lg" />
    </div>
  );
}

export default function Invites({ loaderData }: Route.ComponentProps) {
  const { invites, tokenMismatch, requiresAuth, preview } = loaderData;
  const { isAuthenticated, user, supabase } = useSupabaseAuthContext();
  const currentUserEmail = user?.email?.toLowerCase();

  const onSignIn = useCallback(async () => {
    const redirectPath = window.location.pathname + window.location.search;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Add query params directly to redirectTo URL (like notes app does)
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      },
    });
  }, [supabase]);

  return (
    <div className="space-y-8 pb-8">
      <div className="sticky top-0 z-10">
        <PageTitle title="List Invites" variant="large" />
      </div>

      {tokenMismatch && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          This invite was found, but it belongs to a different user. Please sign in with the correct
          email or ask the sender to re-invite you.
        </div>
      )}

      {/* Empty State */}
      {!requiresAuth && (!invites || invites.length === 0) && !tokenMismatch && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No invitations yet</h3>
          <p className="text-gray-600 max-w-md">
            When someone invites you to collaborate on a list, you'll see it here.
          </p>
        </div>
      )}

      {!requiresAuth && Boolean(invites?.length) && (
        <List>
          {preview && (
            <ReceivedInviteItem
              variant="preview"
              preview={{
                listName: preview.listName,
                coverPhoto: preview.coverPhoto,
                firstItemName: preview.firstItemName,
                invitedUserEmail: preview.invitedUserEmail,
                onSignIn,
              }}
            />
          )}
          {invites.map((listInvite) => (
            <ReceivedInviteItem
              key={`${listInvite.listId}-${listInvite.token}`}
              listInvite={listInvite}
              currentUserEmail={currentUserEmail}
              canAccept={isAuthenticated}
            />
          ))}
        </List>
      )}
    </div>
  );
}

import ErrorBoundary from '~/components/ErrorBoundary';
export { ErrorBoundary };
