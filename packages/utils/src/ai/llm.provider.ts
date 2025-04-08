import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateObject } from 'ai'
import fs from 'node:fs'
import path from 'node:path'

export interface LLMProviderConfig {
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

  getModel() {
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

  async generateObject(params: Parameters<typeof generateObject>) {
    try {
      const response = await generateObject(...params)
      writeToLogFile({
        timestamp: new Date().toISOString(),
        prompt: params[0]?.prompt,
        response,
      })
      return response
    } catch (error) {
      writeToLogFile({
        timestamp: new Date().toISOString(),
        // prompt: params[0]?.prompt,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}

interface GenerateObjectLog {
  timestamp: string
  prompt?: string
  response?: unknown
  error?: string
}

function writeToLogFile(data: GenerateObjectLog) {
  const logDir = path.resolve(process.cwd(), 'logs')
  const logFile = path.resolve(logDir, 'generate-responses.json')

  // Ensure logs directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }

  // Read existing logs or create empty array
  let logs: GenerateObjectLog[] = []
  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, 'utf-8')
      logs = JSON.parse(content)
    } catch (error) {
      console.error('Error reading log file:', error)
    }
  }

  // Add new log entry
  logs.push(data)

  // Write back to file
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2))
}
