import type { RawHonoClient } from '../core/raw-client'

export interface FocusItem {
  kind: 'note' | 'chat'
  id: string
  title: string
  preview: string | null
  updatedAt: string
}

export interface FocusListOutput {
  items: FocusItem[]
}

export interface FocusClient {
  list(): Promise<FocusListOutput>
}

export function createFocusClient(rawClient: RawHonoClient): FocusClient {
  return {
    async list() {
      const res = await rawClient.api.focus.$get()
      return res.json() as Promise<FocusListOutput>
    },
  }
}
