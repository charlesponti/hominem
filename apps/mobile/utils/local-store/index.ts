import type { Chat, ChatMessage, FocusItem, Media, Settings, UserProfile } from './types'
import { createSQLiteStore } from './sqlite'
import {
  UserProfileSchema,
  ChatSchema,
  ChatMessageSchema,
  SettingsSchema,
  MediaSchema,
} from '../validation/schemas'
import { z } from 'zod'

let store: Awaited<ReturnType<typeof createSQLiteStore>> | null = null
let initializationPromise: Promise<boolean> | null = null

async function getStore() {
  if (store) return store
  
  if (!initializationPromise) {
    initializationPromise = initializeStore()
  }
  
  await initializationPromise
  return store!
}

async function initializeStore(): Promise<boolean> {
  if (store) return true
  
  store = await createSQLiteStore()
  return true
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

// Validation wrapper with error handling
function validateOrNull<T>(schema: z.ZodType<T>, data: unknown): T | null {
  try {
    return schema.parse(data)
  } catch (error) {
    console.warn('[LocalStore] Validation failed:', error)
    return null
  }
}

function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data)
}

export const LocalStore = {
  initialize: async (): Promise<boolean> => {
    return initializeStore()
  },

  getUserProfile: async (): Promise<UserProfile | null> => {
    const s = await getStore()
    const result = normalizeNull<UserProfile>(await s.getUserProfile())
    return result ? validateOrNull(UserProfileSchema, result) : null
  },
  
  upsertUserProfile: async (profile: UserProfile): Promise<UserProfile> => {
    const s = await getStore()
    const result = await s.upsertUserProfile(profile)
    return validateOrThrow(UserProfileSchema, result)
  },

  createChat: async (chat: Chat): Promise<Chat> => {
    const s = await getStore()
    const result = await s.createChat(chat)
    return validateOrThrow(ChatSchema, result)
  },
  
  listChats: async (): Promise<Chat[]> => {
    const s = await getStore()
    const results = await s.listChats()
    return results
      .map((chat) => validateOrNull(ChatSchema, chat))
      .filter((chat): chat is NonNullable<typeof chat> => chat !== null) as Chat[]
  },
  
  endChat: async (chatId: string, endedAt: string): Promise<Chat> => {
    const s = await getStore()
    const result = await s.endChat(chatId, endedAt)
    return validateOrThrow(ChatSchema, result)
  },

  addMessage: async (message: ChatMessage): Promise<ChatMessage> => {
    const s = await getStore()
    const result = await s.addMessage(message)
    return validateOrThrow(ChatMessageSchema, result)
  },
  
  listMessages: async (chatId: string): Promise<ChatMessage[]> => {
    const s = await getStore()
    const results = await s.listMessages(chatId)
    return results
      .map((msg) => validateOrNull(ChatMessageSchema, msg))
      .filter((msg): msg is NonNullable<typeof msg> => msg !== null) as ChatMessage[]
  },

  upsertFocusItem: async (item: FocusItem): Promise<FocusItem> => {
    const s = await getStore()
    return s.upsertFocusItem(item)
  },
  
  listFocusItems: async (): Promise<FocusItem[]> => {
    const s = await getStore()
    return s.listFocusItems()
  },
  
  deleteFocusItem: async (id: string): Promise<string> => {
    const s = await getStore()
    return s.deleteFocusItem(id)
  },

  upsertSettings: async (settings: Settings): Promise<Settings> => {
    const s = await getStore()
    const result = await s.upsertSettings(settings)
    return validateOrThrow(SettingsSchema, result)
  },
  
  getSettings: async (): Promise<Settings | null> => {
    const s = await getStore()
    const result = normalizeNull<Settings>(await s.getSettings())
    return result ? validateOrNull(SettingsSchema, result) : null
  },

  upsertMedia: async (media: Media): Promise<Media> => {
    const s = await getStore()
    const result = await s.upsertMedia(media)
    return validateOrThrow(MediaSchema, result)
  },
  
  listMedia: async (): Promise<Media[]> => {
    const s = await getStore()
    const results = await s.listMedia()
    return results
      .map((media) => validateOrNull(MediaSchema, media))
      .filter((media): media is NonNullable<typeof media> => media !== null) as Media[]
  },
  
  clearAllData: async (): Promise<boolean> => {
    const s = await getStore()
    return s.clearAllData()
  },
}
