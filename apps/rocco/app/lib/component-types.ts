import type { List, ListInvite } from '~/lib/types'

export interface InviteItem extends ListInvite {
  list?: List | null
}
