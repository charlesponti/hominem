import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';
import type { MobileIntentSuggestionsOutput } from '../types/mobile.types';

const DEFAULT_SUGGESTIONS: MobileIntentSuggestionsOutput['suggestions'] = [
  {
    id: 'create_image',
    title: 'Create image',
    emoji: '🎨',
    seed_prompt: 'Create an illustration',
  },
  {
    id: 'help_me_learn',
    title: 'Help me learn',
    emoji: '📚',
    seed_prompt: 'Teach me something new',
  },
  {
    id: 'write_anything',
    title: 'Write anything',
    emoji: '📝',
    seed_prompt: 'Draft a concise note',
  },
  {
    id: 'boost_my_day',
    title: 'Boost my day',
    emoji: '✨',
    seed_prompt: 'Share a quick boost',
  },
];

export const mobileRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/intents/suggestions', async (c) => {
    return c.json<MobileIntentSuggestionsOutput>({
      suggestions: DEFAULT_SUGGESTIONS,
    });
  });
