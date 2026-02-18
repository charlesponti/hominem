import type { Note } from '@hominem/hono-rpc/types'

import type { FocusItem, FocusItems } from './types'
import type { FocusItem as LocalFocusItem } from '~/utils/local-store/types'

function parseNoteDate(dateValue?: string | null) {
  if (!dateValue) {
    return null
  }

  const parsed = new Date(dateValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function noteToFocusItem(note: Note): FocusItem {
  return {
    id: note.id,
    text: note.title || note.excerpt || note.content.slice(0, 120),
    type: note.type || 'task',
    category: note.type || null,
    due_date: parseNoteDate(note.scheduledFor),
    state: note.status === 'archived' ? 'completed' : 'active',
    priority: 0,
    sentiment: 'neutral',
    task_size: 'medium',
    profile_id: '',
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    source_note: note,
  }
}

export const toLocalFocusItem = (item: FocusItem): LocalFocusItem => ({
  id: item.id,
  text: item.text,
  status: item.state,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  payloadJson: JSON.stringify(item),
})

export const fromLocalFocusItem = (item: LocalFocusItem): FocusItem => {
  if (item.payloadJson) {
    try {
      return JSON.parse(item.payloadJson) as FocusItem
    } catch {
      // fall through to minimal mapping
    }
  }

  const now = new Date().toISOString()
  const fallbackNote: Note = {
    id: item.id,
    type: 'task',
    status: item.status === 'completed' ? 'archived' : 'draft',
    title: item.text,
    content: item.text,
    excerpt: item.text,
    tags: [],
    mentions: [],
    analysis: null,
    publishingMetadata: null,
    parentNoteId: null,
    versionNumber: 1,
    isLatestVersion: true,
    userId: '',
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
    publishedAt: null,
    scheduledFor: null,
  }

  return {
    id: item.id,
    text: item.text,
    type: 'task',
    category: 'task',
    due_date: null,
    state: item.status === 'completed' ? 'completed' : 'active',
    priority: 0,
    sentiment: 'neutral',
    task_size: 'medium',
    profile_id: '',
    created_at: item.createdAt || now,
    updated_at: item.updatedAt || now,
    source_note: fallbackNote,
  }
}

export const fromLocalFocusItems = (items: LocalFocusItem[]): FocusItems => items.map(fromLocalFocusItem)
