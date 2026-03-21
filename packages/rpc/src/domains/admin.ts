import type { RawHonoClient } from '../core/raw-client'
import type {
  AdminRefreshGooglePlacesInput,
  AdminRefreshGooglePlacesOutput,
} from '../types/admin.types'

export interface AdminClient {
  refreshGooglePlaces(
    input: AdminRefreshGooglePlacesInput,
  ): Promise<AdminRefreshGooglePlacesOutput>
}

export function createAdminClient(rawClient: RawHonoClient): AdminClient {
  return {
    async refreshGooglePlaces(input) {
      const res = await rawClient.api.admin['refresh-google-places'].$post({ json: input })
      return res.json() as Promise<AdminRefreshGooglePlacesOutput>
    },
  }
}
