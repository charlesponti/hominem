import type { RawHonoClient } from '../core/raw-client'
import type {
  ItemsAddToListInput,
  ItemsAddToListOutput,
  ItemsGetByListIdInput,
  ItemsGetByListIdOutput,
  ItemsRemoveFromListInput,
  ItemsRemoveFromListOutput,
} from '../types/items.types'

export interface ItemsClient {
  add(input: ItemsAddToListInput): Promise<ItemsAddToListOutput>
  remove(input: ItemsRemoveFromListInput): Promise<ItemsRemoveFromListOutput>
  getByList(input: ItemsGetByListIdInput): Promise<ItemsGetByListIdOutput>
}

export function createItemsClient(rawClient: RawHonoClient): ItemsClient {
  return {
    async add(input) {
      const res = await rawClient.api.items.add.$post({ json: input })
      return res.json() as Promise<ItemsAddToListOutput>
    },
    async remove(input) {
      const res = await rawClient.api.items.remove.$post({ json: input })
      return res.json() as Promise<ItemsRemoveFromListOutput>
    },
    async getByList(input) {
      const res = await rawClient.api.items['by-list'].$post({ json: input })
      return res.json() as Promise<ItemsGetByListIdOutput>
    },
  }
}
