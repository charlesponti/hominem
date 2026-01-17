import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

// Create a singleton instance to be shared across tools
export const lmstudio = createOpenAICompatible({
  name: 'lmstudio',
  baseURL: 'http://localhost:1234/v1',
})
