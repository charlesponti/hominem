import type { RawHonoClient } from '../core/raw-client'
import type { UserDeleteAccountOutput } from '../types/user.types'

export interface UserClient {
  deleteAccount(): Promise<UserDeleteAccountOutput>
}

export function createUserClient(rawClient: RawHonoClient): UserClient {
  return {
    async deleteAccount() {
      const res = await rawClient.api.user['delete-account'].$post({ json: {} })
      return res.json() as Promise<UserDeleteAccountOutput>
    },
  }
}
