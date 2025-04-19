import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModelV1 } from 'ai'

export type LLMProviderConfig = {
  provider: 'openai' | 'lmstudio' | 'google'
  model?: string
}

const DEFAULT_CONFIG: LLMProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
}

export class LLMProvider {
  private config: LLMProviderConfig

  constructor(config: Partial<LLMProviderConfig> = {}) {
    if (config.provider && !config.model) {
      console.warn(
        `No model specified for provider ${config.provider}. Using default model: ${this.defaultModels[config.provider]}`
      )
    }
    this.config = { ...DEFAULT_CONFIG, ...config }
  }
  private defaultModels: Record<LLMProviderConfig['provider'], string> = {
    openai: 'gpt-4o-mini',
    lmstudio: 'gemma-3-12b-it',
    google: 'gemini-1.5-pro-latest',
  }
  private defaultOpenaiModel = 'gpt-4o-mini'
  private defaultLmStudioModel = 'gemma-3-12b-it'
  private defaultGoogleModel = 'gemini-1.5-pro-latest'

  getModel(): LanguageModelV1 {
    switch (this.config.provider) {
      case 'google': {
        return google(this.config.model || this.defaultGoogleModel, {
          structuredOutputs: true,
        })
      }
      case 'openai':
        return openai(this.config.model || this.defaultOpenaiModel, { structuredOutputs: true })
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
