import { NativeModules } from 'react-native'
import type { Chat, ChatMessage, FocusItem, Media, Settings, UserProfile } from './types'

const { MSCCloudStore } = NativeModules

if (!MSCCloudStore) {
  throw new Error('MSCCloudStore native module not found. Ensure iOS module is linked.')
}

const normalizeNull = <T>(value: T | null): T | null => {
  // @ts-expect-error - runtime check for NSNull from native modules
  if (value && value.constructor && value.constructor.name === 'NSNull') return null
  return value
}

export const LocalStore = {
  initialize: async (): Promise<boolean> => MSCCloudStore.initialize(),

  getUserProfile: async (): Promise<UserProfile | null> =>
    normalizeNull<UserProfile>(await MSCCloudStore.getUserProfile()),
  upsertUserProfile: async (profile: UserProfile): Promise<UserProfile> =>
    MSCCloudStore.upsertUserProfile(profile),

  createChat: async (chat: Chat): Promise<Chat> => MSCCloudStore.createChat(chat),
  listChats: async (): Promise<Chat[]> => MSCCloudStore.listChats(),
  endChat: async (chatId: string, endedAt: string): Promise<Chat> =>
    MSCCloudStore.endChat(chatId, endedAt),

  addMessage: async (message: ChatMessage): Promise<ChatMessage> =>
    MSCCloudStore.addMessage(message),
  listMessages: async (chatId: string): Promise<ChatMessage[]> => MSCCloudStore.listMessages(chatId),

  upsertFocusItem: async (item: FocusItem): Promise<FocusItem> =>
    MSCCloudStore.upsertFocusItem(item),
  listFocusItems: async (): Promise<FocusItem[]> => MSCCloudStore.listFocusItems(),
  deleteFocusItem: async (id: string): Promise<string> => MSCCloudStore.deleteFocusItem(id),

  upsertSettings: async (settings: Settings): Promise<Settings> =>
    MSCCloudStore.upsertSettings(settings),
  getSettings: async (): Promise<Settings | null> =>
    normalizeNull<Settings>(await MSCCloudStore.getSettings()),

  upsertMedia: async (media: Media): Promise<Media> => MSCCloudStore.upsertMedia(media),
  listMedia: async (): Promise<Media[]> => MSCCloudStore.listMedia(),
  clearAllData: async (): Promise<boolean> => MSCCloudStore.clearAllData(),
}
