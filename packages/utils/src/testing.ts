export const openRouterCompletionUsage = {
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  cost: 0.25,
} as const;

export const aiUsageMetrics = {
  provider: 'openrouter',
  model: 'test-model',
  promptTokens: 10,
  outputTokens: 5,
  totalTokens: 15,
  reportedTotalTokens: null,
  costUsd: null,
  cachedPromptTokens: null,
  reasoningTokens: null,
} as const;
