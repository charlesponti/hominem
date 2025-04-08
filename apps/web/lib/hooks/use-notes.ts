import { useApiClient } from '@/lib/hooks/use-api-client'
import type { TextAnalysis } from '@hominem/utils/schemas'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export interface Note {
  id: string
  content: string
  userId: string
  title?: string
  tags?: Record<string, string>[]
  analysis?: TextAnalysis
  createdAt: string
  updatedAt: string
}

// React Query keys
const NOTES_KEY = 'notes'

export function useCreateNote() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<{ content: string } | null>(null)

  const createNote = useMutation({
    mutationFn: (data: { content: string }) =>
      apiClient.post<{ content: string }, Note>('/api/notes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })

  return {
    data,
    setData,
    createNote,
  }
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<{ id: string; data: Partial<Note> } | null>(null)

  const updateNote = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Note> }) =>
      apiClient.put<Partial<Note>, Note>(`/api/notes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })

  return {
    data,
    setData,
    updateNote,
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
  }
}

export function useAnalyzeNote() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  const analyzeNote = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<null, { analysis: TextAnalysis }>(`/api/notes/${id}/analyze`, null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })

  return {
    analyzeNote,
  }
}

export function useNotes() {
  const apiClient = useApiClient()

  const {
    data: notes,
    isLoading,
    error,
  } = useQuery<Note[]>({
    queryKey: [NOTES_KEY],
    queryFn: () => apiClient.get<null, Note[]>('/api/notes'),
  })

  return {
    notes,
    isLoading,
    error,
  }
}
