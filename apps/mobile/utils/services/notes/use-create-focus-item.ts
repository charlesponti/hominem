import { useApiClient } from '@hominem/hono-client/react'
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'

import type { Note } from '@hominem/hono-rpc/types'
import { focusKeys } from './query-keys'

export interface CreateFocusItemInput {
  text: string
}

interface CreateFocusItemContext {
  optimisticId: string
  previousFocusItems: Note[] | undefined
}

function buildOptimisticFocusItem(text: string, optimisticId: string): Note {
  const now = new Date().toISOString()
  const trimmed = text.trim()

  return {
    id: optimisticId,
    title: trimmed.slice(0, 80),
    content: trimmed,
    excerpt: trimmed.slice(0, 160),
    status: 'draft',
    type: 'note',
    tags: [],
    mentions: [],
    analysis: null,
    publishingMetadata: null,
    parentNoteId: null,
    versionNumber: 1,
    isLatestVersion: true,
    userId: '',
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    scheduledFor: null,
  }
}

export const useCreateFocusItem = (): UseMutationResult<
  Note,
  Error,
  CreateFocusItemInput,
  CreateFocusItemContext
> => {
  const client = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<Note, Error, CreateFocusItemInput, CreateFocusItemContext>({
    mutationKey: ['createFocusItem'],
    mutationFn: async (input) => {
      const trimmed = input.text.trim()
      const [firstLine = trimmed] = trimmed.split('\n')
      const createdNote = await client.notes.create({
        content: trimmed,
        excerpt: trimmed.slice(0, 160),
        title: firstLine.slice(0, 80),
        type: 'note',
      })

      return createdNote
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: focusKeys.all })

      const previousFocusItems = queryClient.getQueryData<Note[]>(focusKeys.all)
      const optimisticId = `optimistic-note-${Date.now().toString()}`
      const optimisticFocusItem = buildOptimisticFocusItem(input.text, optimisticId)

      queryClient.setQueryData<Note[]>(focusKeys.all, (current) => [
        optimisticFocusItem,
        ...(current ?? []),
      ])

      return {
        optimisticId,
        previousFocusItems,
      }
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(focusKeys.all, context?.previousFocusItems ?? [])
    },
    onSuccess: async (createdItem, _input, context) => {
      queryClient.setQueryData<Note[]>(focusKeys.all, (current) => {
        const withoutOptimistic = (current ?? []).filter((item) => item.id !== context?.optimisticId)
        return [createdItem, ...withoutOptimistic]
      })

      await queryClient.invalidateQueries({ queryKey: focusKeys.all })
    },
  })
}
