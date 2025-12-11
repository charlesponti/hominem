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
      coverPhoto = firstPlace.imageUrl

      if (!coverPhoto && firstPlace.itemId) {
        const photo = await getPlacePhotoById(firstPlace.itemId)
        coverPhoto = photo ? buildPlacePhotoUrl(photo) : null
      }

      // Format the photo URL if we have one
      if (coverPhoto) {
        coverPhoto = buildPlacePhotoUrl(coverPhoto)
      }
    }
  }

  return {
    listId: list?.id ?? invite.listId,
    listName: list?.name ?? invite.list?.name ?? 'Shared list',
    coverPhoto,
    firstItemName,
    invitedUserEmail: invite.invitedUserEmail,
  }
}
