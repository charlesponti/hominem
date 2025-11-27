import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

const baseURL = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1'

export const lmstudio = createOpenAICompatible({
  name: 'lmstudio',
  baseURL,
})
