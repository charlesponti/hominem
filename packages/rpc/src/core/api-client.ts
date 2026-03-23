import { createAdminClient, type AdminClient } from '../domains/admin';
import { createChatsClient, type ChatsClient } from '../domains/chats';
import { createFocusClient, type FocusClient } from '../domains/focus';
import { createFinanceClient, type FinanceClient } from '../domains/finance';
import { createFilesClient, type FilesClient } from '../domains/files';
import { createInvitesClient, type InvitesClient } from '../domains/invites';
import { createItemsClient, type ItemsClient } from '../domains/items';
import { createListsClient, type ListsClient } from '../domains/lists';
import { createMessagesClient, type MessagesClient } from '../domains/messages';
import { createMobileClient, type MobileClient } from '../domains/mobile';
import { createNotesClient, type NotesClient } from '../domains/notes';
import { createPlacesClient, type PlacesClient } from '../domains/places';
import { createReviewClient, type ReviewClient } from '../domains/review';
import { createTwitterClient, type TwitterClient } from '../domains/twitter';
import { createUserClient, type UserClient } from '../domains/user';

import { createRawHonoClient, type RawHonoClient } from './raw-client';

export interface ClientConfig {
  baseUrl: string;
  getAuthToken: () => Promise<string | null>;
  getHeaders?: () => Promise<Record<string, string>>;
  onError?: (error: Error) => void;
}

export interface ApiClient {
  admin: AdminClient;
  chats: ChatsClient;
  focus: FocusClient;
  finance: FinanceClient;
  files: FilesClient;
  invites: InvitesClient;
  items: ItemsClient;
  lists: ListsClient;
  messages: MessagesClient;
  mobile: MobileClient;
  notes: NotesClient;
  places: PlacesClient;
  review: ReviewClient;
  twitter: TwitterClient;
  user: UserClient;
}

export type RpcClient = ApiClient
export type RpcClientInstance = RawHonoClient
export type HonoClient = RpcClient
export type HonoClientInstance = RpcClientInstance

export function createApiClientFromRaw(rawClient: RawHonoClient): ApiClient {
  return {
    admin: createAdminClient(rawClient),
    chats: createChatsClient(rawClient),
    focus: createFocusClient(rawClient),
    finance: createFinanceClient(rawClient),
    files: createFilesClient(rawClient),
    invites: createInvitesClient(rawClient),
    items: createItemsClient(rawClient),
    lists: createListsClient(rawClient),
    messages: createMessagesClient(rawClient),
    mobile: createMobileClient(rawClient),
    notes: createNotesClient(rawClient),
    places: createPlacesClient(rawClient),
    review: createReviewClient(rawClient),
    twitter: createTwitterClient(rawClient),
    user: createUserClient(rawClient),
  };
}

export function createApiClient(config: ClientConfig): ApiClient {
  const rawClient = createRawHonoClient(config);
  return createApiClientFromRaw(rawClient);
}

export const createClient = createApiClient
export const createHonoClient = createClient
