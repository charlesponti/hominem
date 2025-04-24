import { useApiClient } from '@/lib/hooks/use-api-client'
import type { TextAnalysis } from '@hominem/utils/schemas'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export interface Note {
  id: string
  content: string
  userId: string
  title?: string
  tags?: Array<{ value: string }>
  analysis?: TextAnalysis
  createdAt: string
  updatedAt: string
}

export interface CreateNoteInput {
  content: string
  title?: string
  tags?: Array<{ value: string }>
}

export interface UpdateNoteInput {
  noteId: string
  content?: string
  title?: string
  tags?: Array<{ value: string }>
}

// React Query keys
const NOTES_KEY = 'notes'

export function useCreateNote() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<CreateNoteInput | null>(null)

  const createNote = useMutation({
    mutationFn: async (data: CreateNoteInput) => {
      // Ensure we have the required content field
      if (!data.content?.trim()) {
        throw new Error('Content is required')
      }

      // Create payload with only defined fields
      const notePayload: CreateNoteInput = {
        content: data.content,
        // Only include title if it exists and isn't empty
        ...(data.title?.trim() ? { title: data.title } : {}),
        // Only include tags if they exist
        ...(Array.isArray(data.tags) && data.tags.length > 0 ? { tags: data.tags } : {}),
      }

      console.log('Creating note with payload:', notePayload)

      return apiClient.post<CreateNoteInput, Note>('/api/notes', notePayload)
    },
    onError: (error) => {
      console.error('Error creating note:', error)
    },
    onSuccess: (newNote) => {
      console.log('Note created successfully:', newNote)
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })

  return {
    data,
    setData,
    createNote,
    isLoading: createNote.isLoading,
    isError: createNote.isError,
    error: createNote.error,
  }
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<UpdateNoteInput | null>(null)

  const updateNote = useMutation({
    mutationFn: async (input: UpdateNoteInput) => {
      if (!input.noteId) {
        throw new Error('Note ID is required')
      }

      // Create payload with only defined fields
      const notePayload = {
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.title !== undefined
          ? // Only include title if it's not an empty string
            input.title.trim()
            ? { title: input.title }
            : { title: null }
          : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
      }

      console.log(`Updating note ${input.noteId} with payload:`, notePayload)

      return apiClient.put<typeof notePayload, Note>(`/api/notes/${input.noteId}`, notePayload)
    },
    onError: (error) => {
      console.error('Error updating note:', error)
    },
    onSuccess: () => {
      console.log('Note updated successfully')
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })

  return {
    data,
    setData,
    updateNote,
    isLoading: updateNote.isLoading,
    isError: updateNote.isError,
    error: updateNote.error,
  }
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  const deleteNote = useMutation({
    mutationFn: (id: string) => apiClient.delete<null, { success: boolean }>(`/api/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })

  return {
    deleteNote,
    isLoading: deleteNote.isLoading,
    isError: deleteNote.isError,
    error: deleteNote.error,
  }
}

export function useAnalyzeNote() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  const analyzeNote = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<null, { analysis: TextAnalysis; note: Note }>(
        `/api/notes/${id}/analyze`,
        null
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })

  return {
    analyzeNote,
    isLoading: analyzeNote.isLoading,
    isError: analyzeNote.isError,
    error: analyzeNote.error,
  }
}

export function useNotes(options = {}) {
  const apiClient = useApiClient()

  const query = useQuery<Note[]>({
    queryKey: [NOTES_KEY],
    queryFn: () => apiClient.get<null, Note[]>('/api/notes'),
    staleTime: 30000, // Consider data fresh for 30 seconds
    ...options,
  })

  return {
    notes: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
