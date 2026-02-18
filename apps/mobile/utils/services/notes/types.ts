import type { Note } from '@hominem/hono-rpc/types'

export type FocusItem = {
  id: string
  text: string
  type?: string
  category: string | null
  due_date: string | null
  state: 'active' | 'completed'
  priority?: number
  sentiment?: string
  task_size?: string
  profile_id?: string
  created_at: string
  updated_at: string
  source_note?: Note
}

export type FocusItemInput = Pick<
  FocusItem,
  'text' | 'due_date' | 'category' | 'type' | 'priority' | 'sentiment' | 'task_size'
> & {
  id: string | number
  state: 'active' | 'completed' | 'backlog' | 'deleted'
  profile_id: string
  created_at: string
  updated_at: string
}

export type FocusItems = FocusItem[]

export type FocusResponse = {
  items: FocusItems
}
