import { useQuery } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { captureException } from '@sentry/react-native'
import { useHonoClient } from '@hominem/hono-client/react'

export type IntentSuggestion = {
  id: string
  title: string
  subtitle?: string
  emoji?: string
  seed_prompt?: string
}

const STATIC_DEFAULTS: IntentSuggestion[] = [
  { id: 'create_image', title: 'Create image', emoji: '🎨', seed_prompt: 'Create an illustration' },
  { id: 'help_me_learn', title: 'Help me learn', emoji: '📚', seed_prompt: 'Teach me something new' },
  { id: 'write_anything', title: 'Write anything', emoji: '📝', seed_prompt: 'Draft a concise note' },
  { id: 'boost_my_day', title: 'Boost my day', emoji: '✨', seed_prompt: 'Share a quick boost' },
]

const CACHE_KEY = '@intent_suggestions_cache'

async function readCachedSuggestions() {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY)
    if (!cached) return []
    return JSON.parse(cached) as IntentSuggestion[]
  } catch (error) {
    captureException(error)
    return []
  }
}

async function writeCachedSuggestions(suggestions: IntentSuggestion[]) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(suggestions))
  } catch (error) {
    captureException(error)
  }
}

export function useIntentSuggestions() {
  const client = useHonoClient()

  const query = useQuery<{ suggestions: IntentSuggestion[]; source: 'remote' | 'cache' | 'static' }>({
    queryKey: ['intentSuggestions'],
    queryFn: async () => {
      const cached = await readCachedSuggestions()

      try {
        const response = await client.api.mobile.intents.suggestions.$get()
        const data = (await response.json()) as { suggestions: IntentSuggestion[] }
        const incoming = data?.suggestions ?? []

        if (incoming.length > 0) {
          writeCachedSuggestions(incoming)
          return { suggestions: incoming, source: 'remote' as const }
        }
      } catch (error) {
        captureException(error)
      }

      if (cached.length > 0) return { suggestions: cached, source: 'cache' as const }
      return { suggestions: STATIC_DEFAULTS, source: 'static' as const }
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    suggestions: query.data?.suggestions ?? STATIC_DEFAULTS,
    source: query.data?.source ?? 'static',
    isPending: query.isPending,
    refetch: query.refetch,
  }
}
