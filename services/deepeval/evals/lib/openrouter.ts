export type ChatMessage = {
  role: string;
  content: string | null;
  name?: string;
  toolCalls?: unknown[];
  toolCallId?: string;
};

type ToolDefinition = { type: string; function: Record<string, unknown> };

export type ModelConfig = {
  model: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: Record<string, unknown>;
  tools?: ToolDefinition[];
  reasoning?: {
    effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    max_tokens?: number;
    enabled?: boolean;
    exclude?: boolean;
  };
  /** Extra fields merged straight into the request body, for provider-specific options. */
  extraBody?: Record<string, unknown>;
};

export type ChatReply = { content: string; toolCalls: unknown[] };

const DEFAULT_TARGET_MODEL = 'openai/gpt-4o-mini';
export const TARGET_MODEL = process.env.DEEPEVAL_TARGET_MODEL?.trim() || DEFAULT_TARGET_MODEL;
const reasoningEfforts = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export const TARGET_REASONING = reasoningEfforts.find(
  (effort) => effort === process.env.DEEPEVAL_TARGET_REASONING?.trim(),
);

/**
 * Calls the model under test with a plain fetch instead of deepeval's own
 * model classes - `DeepEvalOpenAICompatibleModel.generate()` only takes a
 * single prompt string with no per-call tool support, so it can't handle
 * multi-turn prompts or the tool-calling suite. deepeval's model classes are
 * still used elsewhere in this package for the judge model, where that shape
 * is fine.
 */
export async function chatComplete(
  messages: ChatMessage[],
  config: ModelConfig,
): Promise<ChatReply> {
  const requestedModel = config.model;
  const local = requestedModel.startsWith('ollama:');
  const model = local ? requestedModel.replace(/^ollama:chat:/, '') : requestedModel;
  const endpoint = local
    ? `${process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'}/v1/chat/completions`
    : 'https://openrouter.ai/api/v1/chat/completions';

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (!local) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is required for evals');
    headers.authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content ?? '',
        ...(message.name ? { name: message.name } : {}),
        ...(message.toolCalls ? { tool_calls: message.toolCalls } : {}),
        ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
      })),
      temperature: config.temperature ?? 0,
      ...(config.maxTokens ? { max_tokens: config.maxTokens } : {}),
      ...(config.responseFormat ? { response_format: config.responseFormat } : {}),
      ...(config.tools ? { tools: config.tools } : {}),
      ...(config.reasoning ? { reasoning: config.reasoning } : {}),
      ...(config.extraBody ?? {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`Model request failed (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string; tool_calls?: unknown[] } }>;
  };
  const message = body.choices?.[0]?.message;
  return { content: message?.content ?? '', toolCalls: message?.tool_calls ?? [] };
}
