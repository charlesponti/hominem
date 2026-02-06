import type { Invite } from '@hominem/hono-rpc/types/invites.types';
import type {
  PlaceCreateOutput,
  PlaceGetDetailsByIdOutput,
} from '@hominem/hono-rpc/types/places.types';
import type { SentInvite as SentInviteType } from '@hominem/invites-services';
import type { ListOutput } from '@hominem/lists-services';

export * from './shared-types';

// App-level type definitions derived from RPC types
export type List = ListOutput;
export type SentInvite = SentInviteType;
// Use RPC Invite type which matches the actual API response
export type ReceivedInvite = Invite;

// Place type - derived from RPC place endpoints which all return the same shape
// Using a union of the two most common outputs (create and get by id)
export type Place = PlaceCreateOutput | PlaceGetDetailsByIdOutput;

export type PlaceWithLists = Place & { lists: ListOutput[] };

// Item type - app-specific shape for list items
export type Item = {
  id: string;
  listId: string;
  name: string;
  description?: string;
  quantity?: number;
  checked?: boolean;
  dueDate?: string;
};
