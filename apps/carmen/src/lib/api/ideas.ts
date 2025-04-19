import { useMutation, useQuery } from '@tanstack/react-query'

export const useGetIdeas = () =>
  useQuery({
    queryKey: ['ideas'],
    queryFn: async () => {
      const res = await fetch('/api/ideas')
      return res.json()
    },
  })

export const useCreateIdea = () =>
  useMutation({
    mutationFn: async (idea: string) => {
      const res = await fetch('/api/idea', {
        method: 'POST',
        body: JSON.stringify(idea),
      })
      return res.json()
    },
  })

export const useDeleteIdea = () =>
  useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/idea/${id}`, {
        method: 'DELETE',
      })
      return res.json()
    },
  })
