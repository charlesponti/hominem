import type { Item as ItemSelect } from '@hominem/db/schema';
import type {
  SentInvite as SentInviteType,
  ReceivedInvite as ReceivedInviteType,
} from '@hominem/invites-services';
import type { List as ListType } from '@hominem/lists-services';
import type { Place as PlaceType } from '@hominem/places-services';

export * from './shared-types';

// Re-export service types
export type List = ListType;
export type SentInvite = SentInviteType;
export type Place = PlaceType;
export type PlaceWithLists = PlaceType & { lists: ListType[] };
export type Item = ItemSelect;
export type ReceivedInvite = ReceivedInviteType;
