import type { Note } from '@hominem/utils/types'
import { trpc } from '~/lib/trpc'

// Hook for listing notes with filters
export function useNotesList(options: {
  types?: ('note' | 'task' | 'timer' | 'journal' | 'document')[]
  query?: string
  tags?: string[]
  since?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
} = {}) {
  return trpc.notes.list.useQuery(options, {
    staleTime: 1000 * 60 * 1, // 1 minute
  })
}

// Hook for getting a single note
export function useNote(id: string) {
  return trpc.notes.get.useQuery({ id }, {
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook for creating a note
export function useCreateNote() {
  const utils = trpc.useUtils()
  
  return trpc.notes.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch notes list
      utils.notes.list.invalidate()
    },
  })
}

// Hook for updating a note
export function useUpdateNote() {
  const utils = trpc.useUtils()
  
  return trpc.notes.update.useMutation({
    onSuccess: (data) => {
      // Invalidate and refetch notes list
      utils.notes.list.invalidate()
      // Update the specific note in cache
      utils.notes.get.setData({ id: data.id }, data)
    },
  })
}

// Hook for deleting a note
export function useDeleteNote() {
  const utils = trpc.useUtils()
  
  return trpc.notes.delete.useMutation({
    onSuccess: () => {
      // Invalidate and refetch notes list
      utils.notes.list.invalidate()
    },
  })
}

// Hook for syncing notes
export function useSyncNotes() {
  const utils = trpc.useUtils()
  
  return trpc.notes.sync.useMutation({
    onSuccess: () => {
      // Invalidate and refetch notes list
      utils.notes.list.invalidate()
    },
  })
} 
