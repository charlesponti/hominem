import { createOpenaiChat } from '@tanstack/ai-openai'
import { env } from '@/lib/env'

/**
 * Create LM Studio adapter for TanStack AI
 * Uses OpenAI-compatible API endpoint
 */
export function getLMStudioAdapter() {
  return createOpenaiChat('gpt-4.1', env.OPENAI_API_KEY)
}
