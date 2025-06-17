import OpenAI from 'openai'

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// Export types for convenience
export type { 
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletion
} from 'openai/resources/chat/completions'