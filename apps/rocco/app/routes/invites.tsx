import { useSupabaseAuthContext } from '@hominem/auth';
import { PageTitle } from '@hominem/ui';
import { List } from '@hominem/ui/list';
import { Loading } from '@hominem/ui/loading';
import { Mail } from 'lucide-react';
import { useCallback } from 'react';
import { data } from 'react-router';

import ReceivedInviteItem from '~/components/ReceivedInviteItem';
import { getAuthState, getServerSession } from '~/lib/auth.server';
import { clientEnv } from '~/lib/env';
import { createServerHonoClient } from '~/lib/api.server';
import { buildInvitePreview } from '~/lib/services/invite-preview.server';

import type { Route } from './+types/invites';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || undefined;

  const { isAuthenticated, headers } = await getAuthState(request);

  // If not authenticated, allow viewing the page and return preview data when possible
  if (!isAuthenticated) {
    const preview = token ? await buildInvitePreview(token, request) : null;

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
  const { user, session } = await getServerSession(request);
  if (!user || !session) {
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

  // Authenticated flow: fetch invites via RPC
  const client = createServerHonoClient(session.access_token, request);
  const res = await client.api.invites.received.$post({ json: { token } });
  const rawInvites = res.ok ? await res.json() : [];

  // Normalize invites to ensure exactOptionalPropertyTypes compliance
  const invites = rawInvites.map((invite: (typeof rawInvites)[number]) => {
    const normalized: typeof invite = {
      id: invite.id,
      listId: invite.listId,
      invitingUserId: invite.invitingUserId,
      invitedUserId: invite.invitedUserId,
      invitedUserEmail: invite.invitedUserEmail,
      token: invite.token,
      status: invite.status,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt,
    };

    // Only add optional properties if they exist
    if (invite.list) {
      normalized.list = {
        id: invite.list.id,
        name: invite.list.name,
        ...(invite.list.ownerId !== undefined ? { ownerId: invite.list.ownerId } : {}),
      };
    }

    if (invite.invitingUser) {
      normalized.invitingUser = {
        id: invite.invitingUser.id,
        email: invite.invitingUser.email,
        ...(invite.invitingUser.name !== undefined ? { name: invite.invitingUser.name } : {}),
      };
    }

    if (invite.belongsToAnotherUser) {
      normalized.belongsToAnotherUser = invite.belongsToAnotherUser;
    }

    return normalized;
  });

  // Check if token belongs to another user
  const tokenMismatch = token
    ? Boolean(
        rawInvites.find((invite: (typeof rawInvites)[number]) => invite.token === token)
          ?.belongsToAnotherUser,
      )
    : false;

  return data({ invites, tokenMismatch, requiresAuth: false, preview: null }, { headers });
}

export function meta(args: Route.MetaArgs) {
  const loaderData = args.loaderData;
  const preview = loaderData?.preview;

  // Build URL
  const fullPath = args.location.pathname + args.location.search;
  const url = new URL(fullPath, clientEnv.VITE_APP_BASE_URL);

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
        <div className="border border-destructive/50 border-2 p-4 text-sm text-destructive">
          Invite belongs to another user. Sign in with the correct email or request re-invite.
        </div>
      )}

      {/* Empty State */}
      {!requiresAuth && (!invites || invites.length === 0) && !tokenMismatch && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted p-6 md:p-12 text-center">
          <div className="w-16 h-16 border border-muted flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No invitations yet</h3>
          <p className="text-muted-foreground max-w-md">
            Invitations will appear here when received.
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
          {invites.map((listInvite: (typeof invites)[number]) => (
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
