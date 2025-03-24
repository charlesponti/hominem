import { openai } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { ollama } from './ollama'

export interface LLMProviderConfig {
  provider: 'openai' | 'ollama' | 'lmstudio' | 'google'
  model?: string
}

const DEFAULT_CONFIG: LLMProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
}

export class LLMProvider {
  private config: LLMProviderConfig

  constructor(config: Partial<LLMProviderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private defaultOllamaModel = 'llama3.2'
  private defaultOpenaiModel = 'gpt-4o-mini'
  private defaultLmStudioModel = 'gemma-3-12b-it'
  private defaultGoogleModel = 'gemini-1.5-flash-latest'

  getModel() {
    switch (this.config.provider) {
      case 'google':
        return openai(this.config.model || this.defaultGoogleModel, { structuredOutputs: true })
      case 'openai':
        return openai(this.config.model || this.defaultOpenaiModel, { structuredOutputs: true })
      case 'ollama':
        return ollama(this.config.model || this.defaultOllamaModel, { structuredOutputs: true })
      case 'lmstudio': {
        const lmstudio = createOpenAICompatible({
          name: 'lmstudio',
          baseURL: 'http://localhost:1234/v1',
        })
        return lmstudio(this.config.model || this.defaultLmStudioModel)
      }
      default:
        return openai(this.defaultOpenaiModel, { structuredOutputs: true })
    }
  }
}
