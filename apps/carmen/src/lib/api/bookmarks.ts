import { useMutation, useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import type { Bookmark } from '../types'
import { api } from './base'

export const useGetBookmarks = () => {
  return useQuery<Bookmark[]>({
    queryKey: ['bookmarks'],
    queryFn: async () => fetch('/api/bookmarks').then((res) => res.json()),
  })
}

export const useDeleteBookmark = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bookmarks/${id}`, {
        method: 'DELETE',
      })
      return res.json()
    },
  })
}

export const useCreateBookmark = () => {
  return useMutation<Bookmark, AxiosError, string>({
    mutationFn: async (url: string) => {
      const response = await api.post('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ url }),
      })
      return response.data
    },
  })
}
