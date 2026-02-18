export type UserProfile = {
  id: string
  name?: string | null
  email?: string | null
  createdAt: string
  updatedAt: string
}

export type Chat = {
  id: string
  createdAt: string
  endedAt?: string | null
  title?: string | null
}

export type ChatMessage = {
  id: string
  chatId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
  focusItemsJson?: string | null
  focusIdsJson?: string | null
}

export type FocusItem = {
  id: string
  text: string
  status: string
  createdAt: string
  updatedAt: string
  payloadJson?: string | null
}

export type Settings = {
  id: string
  theme?: string | null
  preferencesJson?: string | null
}

export type Media = {
  id: string
  type: string
  localURL: string
  createdAt: string
}
