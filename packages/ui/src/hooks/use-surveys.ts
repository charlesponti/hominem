import { useApiClient } from '@hominem/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export interface SurveyOption {
  id: string
  title: string
  description: string
  surveyId: string
}

export interface SurveyVote {
  id: string
  surveyId: string
  optionId: string
  userId: string
}

export interface Survey {
  id: string
  name: string
  description: string
  userId: string
  createdAt: string
  updatedAt: string
  options: SurveyOption[]
  votes: SurveyVote[]
}

export interface CreateSurveyInput {
  name: string
  description: string
  options: Array<{
    title: string
    description: string
  }>
}

export interface VoteInput {
  surveyId: string
  optionId: string
}

// React Query keys
const SURVEYS_KEY = 'surveys'

export function useCreateSurvey() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<CreateSurveyInput | null>(null)

  const createSurvey = useMutation({
    mutationFn: (data: CreateSurveyInput) =>
      apiClient.post<CreateSurveyInput, Survey>('/api/surveys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SURVEYS_KEY] })
    },
  })

  return {
    data,
    setData,
    createSurvey,
  }
}

export function useVoteSurvey() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<VoteInput | null>(null)

  const voteSurvey = useMutation({
    mutationFn: (data: VoteInput) =>
      apiClient.post<VoteInput, { success: boolean }>('/api/surveys/vote', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SURVEYS_KEY] })
    },
  })

  return {
    data,
    setData,
    voteSurvey,
  }
}

export function useSurveys() {
  const apiClient = useApiClient()

  const {
    data: surveys,
    isLoading,
    error,
  } = useQuery<Survey[]>({
    queryKey: [SURVEYS_KEY],
    queryFn: () => apiClient.get<null, Survey[]>('/api/surveys'),
  })

  return {
    surveys,
    isLoading,
    error,
  }
}
