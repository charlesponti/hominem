import { getInviteByToken, getPlaceListPreview } from '@hominem/lists-services';
import { getPlacePhotoById } from '@hominem/places-services';
import { getHominemPhotoURL } from '@hominem/utils/images';

export type InvitePreview = {
  listId?: string;
  listName: string;
  coverPhoto?: string | null;
  firstItemName?: string | null;
  invitedUserEmail?: string | null;
};

/**
 * Builds preview data for an invite when the user is not authenticated.
 * This allows users to see what list they're being invited to before signing in.
 *
 * @param token - The invite token from the URL query parameter
 * @returns Preview data or null if invite not found
 */
export async function buildInvitePreview(token: string): Promise<InvitePreview | null> {
  const invite = await getInviteByToken(token);

  if (!invite) {
    return null;
  }

  const list = invite.list;
  let coverPhoto: string | null | undefined;
  let firstItemName: string | null | undefined;

  if (list?.id) {
    const firstPlace = await getPlaceListPreview(list.id);

    if (firstPlace) {
      firstItemName = firstPlace.name ?? firstPlace.description ?? null;

      // Prefer server-provided resolved photo URL when available
      coverPhoto = (firstPlace as { photoUrl?: string }).photoUrl ?? firstPlace.imageUrl;

      // Fall back to fetching by place photo id and resolve on the server
      if (!coverPhoto && firstPlace.itemId) {
        const rawPhoto = await getPlacePhotoById(firstPlace.itemId);
        coverPhoto = rawPhoto ? getHominemPhotoURL(rawPhoto, 600, 400) : null;
      }
    }
  }

  return {
    listId: list?.id ?? invite.listId,
    listName: list?.name ?? invite.list?.name ?? 'Shared list',
    coverPhoto: coverPhoto || undefined,
    firstItemName,
    invitedUserEmail: invite.invitedUserEmail,
  };
}
