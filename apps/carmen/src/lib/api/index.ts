import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import type { AxiosError } from 'axios'

import type { List, ListInvite, ListPlace, User, UserList } from 'src/lib/types'

import { api, baseURL } from './base'

export const useGetInvites = () => {
  return useQuery<ListInvite[]>({
    queryKey: ['invites'],
    queryFn: async () => {
      const res = await api.get(`${baseURL}/invites`)
      return res.data
    },
  })
}

type OutboundInvitesResponse = (ListInvite & { list: List; user: User })[]
export const useGetOutboundInvites = () => {
  return useQuery<OutboundInvitesResponse>({
    queryKey: ['outboundInvites'],
    queryFn: async () => {
      const res = await api.get(`${baseURL}/invites/outbound`)
      return res.data
    },
  })
}

export function useAcceptInviteMutation(
  options: UseMutationOptions<unknown, unknown, string> = {}
) {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`${baseURL}/invites/${id}/accept`)
      return res.data
    },
    ...options,
  })
}

type ListInvitesResponse = (ListInvite & { list: List })[]
export const useGetListInvites = (id: string) => {
  return useQuery<ListInvitesResponse>({
    queryKey: ['listInvites'],
    queryFn: async () => {
      const res = await api.get(`${baseURL}/lists/${id}/invites`)
      return res.data
    },
  })
}

export const useCreateListInvite = ({
  onSuccess,
  onError,
}: {
  onSuccess: (data: ListInvite) => void
  onError?: (err: AxiosError) => void
}) => {
  return useMutation({
    mutationFn: async ({ email, id }: { email: string; id: string }) => {
      const res = await api.post(`${baseURL}/lists/${id}/invites`, {
        email,
      })
      return res.data
    },
    onError,
    onSuccess,
  })
}

export const useGetLists = ({
  options,
}: {
  options?: Omit<
    UseQueryOptions<UserList[], { message: string }, UserList[], QueryKey>,
    'queryKey' | 'queryFn'
  >
} = {}) => {
  return useQuery<UserList[], { message: string }>({
    queryKey: ['lists'],
    queryFn: async () => {
      const res = await api.get(`${baseURL}/lists`)
      return res.data
    },
    ...options,
  })
}

type GetListResponse = UserList & {
  id: string
  items: ListPlace[]
}
export const useGetList = (id: string) => {
  return useQuery<undefined | GetListResponse, AxiosError>({
    queryKey: ['list', id],
    queryFn: async () => {
      const res = await api.get<GetListResponse>(`${baseURL}/lists/${id}`)
      return res.data
    },
    retry: false,
  })
}

export const useUpdateList = () => {
  return useMutation({
    mutationFn: async (list: List) => {
      const res = await api.put(`${baseURL}/lists/${list.id}`, {
        list,
      })
      return res.data
    },
  })
}

export const useDeleteList = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`${baseURL}/lists/${id}`)
      return res.data
    },
  })
}

export default api
