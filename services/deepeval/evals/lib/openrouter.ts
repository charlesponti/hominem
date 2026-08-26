export type ChatMessage = {
  role: string;
  content: string | null;
  name?: string;
  toolCalls?: unknown[];
  toolCallId?: string;
};

export type ToolDefinition = { type: string; function: Record<string, unknown> };

export type ModelConfig = {
  model: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: Record<string, unknown>;
  tools?: ToolDefinition[];
  /** Extra fields merged directly into the request body, for provider-specific options. */
  extraBody?: Record<string, unknown>;
};

export type ChatReply = { content: string; toolCalls: unknown[] };

export const DEFAULT_TARGET_MODEL = 'openai/gpt-4o-mini';

/**
 * Calls the model under test. Deliberately a plain fetch rather than
 * deepeval's own model classes: `DeepEvalOpenAICompatibleModel.generate()`
 * takes a single prompt string with no per-call tool support, which can't
 * express multi-turn system/user prompts or the tool-calling suite. deepeval's
 * model classes are used elsewhere in this package for the judge model, where
 * that shape fits.
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
