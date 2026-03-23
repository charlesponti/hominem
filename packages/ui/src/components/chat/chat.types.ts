import type { ChatMessage as RpcChatMessage } from '@hominem/rpc/types'
import type React from 'react'

export type ChatIconName =
  | 'arrows-rotate'
  | 'copy'
  | 'magnifying-glass'
  | 'pen-to-square'
  | 'plus'
  | 'share-from-square'
  | 'speaker'
  | 'stop'
  | 'trash'
  | 'x'

export type ChatRenderIcon = (
  name: ChatIconName,
  props: {
    color?: string
    size: number
    style?: object
    useSymbol?: boolean
  },
) => React.ReactNode

export type MarkdownComponent = React.ComponentType<{
  children: React.ReactNode
  style?: object
}>

export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant' | 'system'
  message: string
  created_at: string
  chat_id: string
  profile_id: string
  focus_ids: string[] | null
  focus_items: Array<{ id: string; text: string }> | null
  reasoning?: string | null
  toolCalls: RpcChatMessage['toolCalls']
  isStreaming?: boolean
}
