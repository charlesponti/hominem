import type { LanguageModelV1 } from 'ai'

import { createOpenAI } from '@ai-sdk/openai'
import { logger } from '@hominem/utils/logger'
import OpenAI from 'openai'

import { env } from './env'

const DEFAULT_AI_MODEL = 'gpt-5-mini'

type SharedAiProvider = 'openai' | 'opencode-zen'

interface SharedTextModelOptions {
  structuredOutputs?: boolean
}

let hasLoggedSharedAiConfiguration = false

function getSharedAiProvider(): SharedAiProvider {
  return env.AI_PROVIDER === 'opencode-zen' ? 'opencode-zen' : 'openai'
}

function getSharedAiModelId(): string {
  return env.AI_MODEL || DEFAULT_AI_MODEL
}

function logSharedAiConfiguration() {
  if (hasLoggedSharedAiConfiguration) {
    return
  }

  const provider = getSharedAiProvider()
  const modelId = getSharedAiModelId()

  logger.info('[ai-model] using shared AI configuration', {
    provider,
    modelId,
    ...(provider === 'opencode-zen' && env.OPENCODE_ZEN_BASE_URL
      ? { baseUrl: env.OPENCODE_ZEN_BASE_URL }
      : {}),
  })

  hasLoggedSharedAiConfiguration = true
}

export function getSharedTextModel(options: SharedTextModelOptions = {}): LanguageModelV1 {
  const provider = getSharedAiProvider()
  const modelId = getSharedAiModelId()

  logSharedAiConfiguration()

  if (provider === 'opencode-zen') {
    if (!env.OPENCODE_ZEN_BASE_URL || !env.OPENCODE_ZEN_API_KEY) {
      throw new Error('OPENCODE_ZEN_BASE_URL and OPENCODE_ZEN_API_KEY are required when AI_PROVIDER=opencode-zen')
    }

    const zen = createOpenAI({
      apiKey: env.OPENCODE_ZEN_API_KEY,
      baseURL: env.OPENCODE_ZEN_BASE_URL,
    })

    return options.structuredOutputs === undefined
      ? zen.chat(modelId)
      : zen.chat(modelId, { structuredOutputs: options.structuredOutputs })
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai')
  }

  const providerClient = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
  })

  return options.structuredOutputs === undefined
    ? providerClient.chat(modelId)
    : providerClient.chat(modelId, { structuredOutputs: options.structuredOutputs })
}

export function getSharedAiModelConfig() {
  return {
    provider: getSharedAiProvider(),
    modelId: getSharedAiModelId(),
  }
}

export function getSharedOpenAIClient() {
  const { provider } = getSharedAiModelConfig()

  logSharedAiConfiguration()

  if (provider === 'opencode-zen') {
    if (!env.OPENCODE_ZEN_BASE_URL || !env.OPENCODE_ZEN_API_KEY) {
      throw new Error('OPENCODE_ZEN_BASE_URL and OPENCODE_ZEN_API_KEY are required when AI_PROVIDER=opencode-zen')
    }

    return new OpenAI({
      apiKey: env.OPENCODE_ZEN_API_KEY,
      baseURL: env.OPENCODE_ZEN_BASE_URL,
    })
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai')
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  })
}
