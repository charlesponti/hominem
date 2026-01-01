import { getInviteByToken } from '@hominem/data'
import { getPlaceListPreview } from '@hominem/data/lists'
import { getPlacePhotoById } from '@hominem/data/places'
import { buildPlacePhotoUrl } from '~/lib/photo-utils'

export type InvitePreview = {
  listId?: string
  listName: string
  coverPhoto?: string | null
  firstItemName?: string | null
  invitedUserEmail?: string | null
}

/**
 * Builds preview data for an invite when the user is not authenticated.
 * This allows users to see what list they're being invited to before signing in.
 *
 * @param token - The invite token from the URL query parameter
 * @returns Preview data or null if invite not found
 */
export async function buildInvitePreview(token: string): Promise<InvitePreview | null> {
  const invite = await getInviteByToken(token)

  if (!invite) {
    return null
  }

  const list = invite.list
  let coverPhoto: string | null | undefined
  let firstItemName: string | null | undefined

  if (list?.id) {
    const firstPlace = await getPlaceListPreview(list.id)

    if (firstPlace) {
      firstItemName = firstPlace.name ?? firstPlace.description ?? null

      // Try to get cover photo from imageUrl first, then fall back to fetching photo by ID
      coverPhoto = firstPlace.imageUrl

      if (!coverPhoto && firstPlace.itemId) {
        coverPhoto = await getPlacePhotoById(firstPlace.itemId)
      }

      // Only process with buildPlacePhotoUrl if it's a Google Places photo reference
      // If it's already a full URL, use it as-is
      if (coverPhoto) {
        if (
          coverPhoto.includes('places/') ||
          coverPhoto.includes('/photos/') ||
          coverPhoto.includes('googleusercontent')
        ) {
          // Google Places photo reference, process it to get absolute URL
          coverPhoto = buildPlacePhotoUrl(coverPhoto)
        } else if (!(coverPhoto.startsWith('http://') || coverPhoto.startsWith('https://'))) {
          // Not a Google Places photo reference and not a full URL - skip it
          coverPhoto = null
        }
        // If it's already a full URL (http/https), leave it as-is
      }
    }
  }

  return {
    listId: list?.id ?? invite.listId,
    listName: list?.name ?? invite.list?.name ?? 'Shared list',
    coverPhoto: coverPhoto || undefined,
    firstItemName,
    invitedUserEmail: invite.invitedUserEmail,
  }
}
