import type { ItemOutput as ItemSelect } from '@hominem/db/types/items';
import type { PlaceOutput as PlaceType } from '@hominem/db/types/places';
import type {
  SentInvite as SentInviteType,
  ReceivedInvite as ReceivedInviteType,
} from '@hominem/invites-services';
import type { ListOutput } from '@hominem/lists-services';

export * from './shared-types';

// Re-export service types
export type List = ListOutput;
export type SentInvite = SentInviteType;
export type Place = PlaceType;
export type PlaceWithLists = PlaceType & { lists: ListOutput[] };
export type Item = ItemSelect;
export type ReceivedInvite = ReceivedInviteType;
