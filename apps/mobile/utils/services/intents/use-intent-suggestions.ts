import { useApiClient } from '@hominem/hono-client/react';
import { useQuery } from '@tanstack/react-query';
import { storage } from '~/lib/storage';

export type IntentSuggestion = {
  id: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  seed_prompt?: string;
};

const STATIC_DEFAULTS: IntentSuggestion[] = [
  { id: 'create_image', title: 'Create image', seed_prompt: 'Create an illustration' },
  { id: 'help_me_learn', title: 'Help me learn', seed_prompt: 'Teach me something new' },
  { id: 'write_anything', title: 'Write anything', seed_prompt: 'Draft a concise note' },
  { id: 'boost_my_day', title: 'Boost my day', seed_prompt: 'Share a quick boost' },
];

const CACHE_KEY = '@intent_suggestions_cache';

function readCachedSuggestions(): IntentSuggestion[] {
  try {
    const cached = storage.getString(CACHE_KEY);
    if (!cached) return [];
    return JSON.parse(cached) as IntentSuggestion[];
  } catch {
    return [];
  }
}

function writeCachedSuggestions(suggestions: IntentSuggestion[]) {
  try {
    storage.set(CACHE_KEY, JSON.stringify(suggestions));
  } catch {
    // ignore write failures
  }
}

export function useIntentSuggestions() {
  const client = useApiClient();

  const query = useQuery<{
    suggestions: IntentSuggestion[];
    source: 'remote' | 'cache' | 'static';
  }>({
    queryKey: ['intentSuggestions'],
    queryFn: async () => {
      const cached = readCachedSuggestions();

      try {
        const data = await client.mobile.getIntentSuggestions();
        const incoming = data?.suggestions ?? [];

        if (incoming.length > 0) {
          writeCachedSuggestions(incoming);
          return { suggestions: incoming, source: 'remote' as const };
        }
      } catch (error) {
        console.error('[intent-suggestions] fetch failed', error);
      }

      if (cached.length > 0) return { suggestions: cached, source: 'cache' as const };
      return { suggestions: STATIC_DEFAULTS, source: 'static' as const };
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    suggestions: query.data?.suggestions ?? STATIC_DEFAULTS,
    source: query.data?.source ?? 'static',
    isPending: query.isPending,
    refetch: query.refetch,
  };
}
