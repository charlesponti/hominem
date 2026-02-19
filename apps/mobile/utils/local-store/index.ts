import { NativeModules, Platform } from 'react-native'
import type { Chat, ChatMessage, FocusItem, Media, Settings, UserProfile } from './types'
import { E2E_TESTING } from '~/utils/constants'
import { createSQLiteStore, migrateInMemoryToSQLite } from './sqlite'

const { MSCCloudStore } = NativeModules

type MSCCloudStoreShape = {
  initialize: () => Promise<boolean>
  getUserProfile: () => Promise<UserProfile | null>
  upsertUserProfile: (profile: UserProfile) => Promise<UserProfile>
  createChat: (chat: Chat) => Promise<Chat>
  listChats: () => Promise<Chat[]>
  endChat: (chatId: string, endedAt: string) => Promise<Chat>
  addMessage: (message: ChatMessage) => Promise<ChatMessage>
  listMessages: (chatId: string) => Promise<ChatMessage[]>
  upsertFocusItem: (item: FocusItem) => Promise<FocusItem>
  listFocusItems: () => Promise<FocusItem[]>
  deleteFocusItem: (id: string) => Promise<string>
  upsertSettings: (settings: Settings) => Promise<Settings>
  getSettings: () => Promise<Settings | null>
  upsertMedia: (media: Media) => Promise<Media>
  listMedia: () => Promise<Media[]>
  clearAllData: () => Promise<boolean>
}

const createInMemoryStore = () => {
  let userProfile: UserProfile | null = null
  let settings: Settings | null = null
  const chats: Chat[] = []
  const messages: ChatMessage[] = []
  const focusItems: FocusItem[] = []
  const mediaItems: Media[] = []

  const store: MSCCloudStoreShape = {
    initialize: async () => true,
    getUserProfile: async () => userProfile,
    upsertUserProfile: async (profile) => {
      userProfile = profile
      return profile
    },
    createChat: async (chat) => {
      chats.push(chat)
      return chat
    },
    listChats: async () => [...chats],
    endChat: async (chatId, endedAt) => {
      const index = chats.findIndex((chat) => chat.id === chatId)
      if (index >= 0) {
        const updated = { ...chats[index], endedAt }
        chats[index] = updated
        return updated
      }
      return { id: chatId, createdAt: endedAt, endedAt }
    },
    addMessage: async (message) => {
      messages.push(message)
      return message
    },
    listMessages: async (chatId) => messages.filter((message) => message.chatId === chatId),
    upsertFocusItem: async (item) => {
      const index = focusItems.findIndex((existing) => existing.id === item.id)
      if (index >= 0) {
        focusItems[index] = item
        return item
      }
      focusItems.push(item)
      return item
    },
    listFocusItems: async () => [...focusItems],
    deleteFocusItem: async (id) => {
      const index = focusItems.findIndex((item) => item.id === id)
      if (index >= 0) {
        focusItems.splice(index, 1)
      }
      return id
    },
    upsertSettings: async (nextSettings) => {
      settings = nextSettings
      return nextSettings
    },
    getSettings: async () => settings,
    upsertMedia: async (media) => {
      const index = mediaItems.findIndex((item) => item.id === media.id)
      if (index >= 0) {
        mediaItems[index] = media
        return media
      }
      mediaItems.push(media)
      return media
    },
    listMedia: async () => [...mediaItems],
    clearAllData: async () => {
      userProfile = null
      settings = null
      chats.splice(0, chats.length)
      messages.splice(0, messages.length)
      focusItems.splice(0, focusItems.length)
      mediaItems.splice(0, mediaItems.length)
      return true
    },
  }

  return {
    store,
    snapshot: () => ({
      userProfile,
      settings,
      chats: [...chats],
      messages: [...messages],
      focusItems: [...focusItems],
      mediaItems: [...mediaItems],
    }),
  }
}

const isNativeStoreAvailable = Boolean(MSCCloudStore)
const inMemory = createInMemoryStore()
let store: MSCCloudStoreShape = inMemory.store

const useSQLite = __DEV__ || E2E_TESTING || Platform.OS === 'ios'

if (isNativeStoreAvailable) {
  store = MSCCloudStore
} else if (!useSQLite && !__DEV__ && !E2E_TESTING) {
  throw new Error('MSCCloudStore native module not found. Ensure iOS module is linked.')
}

const normalizeNull = <T>(value: T | null): T | null => {
  if (
    value &&
    typeof value === 'object' &&
    'constructor' in value &&
    typeof value.constructor === 'function' &&
    value.constructor.name === 'NSNull'
  ) {
    return null
  }
  return value
}

export const LocalStore = {
  initialize: async (): Promise<boolean> => {
    if (!isNativeStoreAvailable && useSQLite) {
      const sqliteStore = await createSQLiteStore()
      await migrateInMemoryToSQLite(sqliteStore, inMemory.snapshot())
      store = sqliteStore
    }
    return store.initialize()
  },

  getUserProfile: async (): Promise<UserProfile | null> =>
    normalizeNull<UserProfile>(await store.getUserProfile()),
  upsertUserProfile: async (profile: UserProfile): Promise<UserProfile> =>
    store.upsertUserProfile(profile),

  createChat: async (chat: Chat): Promise<Chat> => store.createChat(chat),
  listChats: async (): Promise<Chat[]> => store.listChats(),
  endChat: async (chatId: string, endedAt: string): Promise<Chat> =>
    store.endChat(chatId, endedAt),

  addMessage: async (message: ChatMessage): Promise<ChatMessage> =>
    store.addMessage(message),
  listMessages: async (chatId: string): Promise<ChatMessage[]> => store.listMessages(chatId),

  upsertFocusItem: async (item: FocusItem): Promise<FocusItem> =>
    store.upsertFocusItem(item),
  listFocusItems: async (): Promise<FocusItem[]> => store.listFocusItems(),
  deleteFocusItem: async (id: string): Promise<string> => store.deleteFocusItem(id),

  upsertSettings: async (settings: Settings): Promise<Settings> =>
    store.upsertSettings(settings),
  getSettings: async (): Promise<Settings | null> =>
    normalizeNull<Settings>(await store.getSettings()),

  upsertMedia: async (media: Media): Promise<Media> => store.upsertMedia(media),
  listMedia: async (): Promise<Media[]> => store.listMedia(),
  clearAllData: async (): Promise<boolean> => store.clearAllData(),
}
