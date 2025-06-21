import { LLMProvider } from '@hominem/ai'

export const llm = new LLMProvider({
  provider: 'openai',
  model: 'gpt-4',
})

export const model = llm.getModel()
