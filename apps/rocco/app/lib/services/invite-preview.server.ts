import type { InvitesPreviewOutput } from '@hominem/hono-rpc/types/invites.types';

import { createServerHonoClient } from '~/lib/api.server';

/**
 * Builds preview data for an invite when the user is not authenticated.
 * This allows users to see what list they're being invited to before signing in.
 *
 * @param token - The invite token from the URL query parameter
 * @returns Preview data or null if invite not found
 */
export type InvitePreview = InvitesPreviewOutput;

export async function buildInvitePreview(
  token: string,
  request?: Request,
): Promise<InvitePreview | null> {
  const client = createServerHonoClient(undefined, request);
  const res = await client.api.invites.preview.$post({ json: { token } });
  if (!res.ok) {
    return null;
  }

  return res.json();
}
