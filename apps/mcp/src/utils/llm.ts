import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

// Create a singleton instance to be shared across tools
// Allow configuration via environment variable for testing/CI
const baseURL = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1'

export const lmstudio = createOpenAICompatible({
  name: 'lmstudio',
  baseURL,
})

// Helper to check if LLM is available (useful for tests)
export const isLLMAvailable = () => {
  return !!process.env.LM_STUDIO_URL || process.env.NODE_ENV !== 'test'
}
