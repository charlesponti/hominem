// JSON values safe to send across the durable event boundary
export type GenerationJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly GenerationJsonValue[]
  | { readonly [key: string]: GenerationJsonValue };

// Provider/tool request context kept around so a generation can be resumed
export type GenerationRequestContext = {
  readonly [key: string]: GenerationJsonValue;
};

// The minimum you need to start or resume a generation
export type GenerationStartContext = {
  chatId: string;
  kind: 'send' | 'start' | 'regenerate';
  userMessageId: string | null;
  targetAssistantMessageId: string | null;
  requestContext: GenerationRequestContext;
};

// Minimal message shape needed to reconcile optimistic vs. persisted messages
export type GenerationMessageSnapshot = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string | null;
};

// Stable identity shared by all provider/tool events within one turn
export type GenerationTurn = {
  turnId: string;
  iteration: number;
};

export type GenerationRetryMetadata = GenerationTurn & {
  operation: 'provider' | 'tool';
  attempt: number;
  maxAttempts: number;
  retryAt: string;
  errorCategory: string;
};

export type GenerationCheckpoint = GenerationTurn & {
  assistantMessage: GenerationMessageSnapshot;
  pendingToolCallIds: readonly string[];
};

export type GenerationTerminalMetadata = GenerationTurn & {
  assistantMessage?: GenerationMessageSnapshot;
  errorCategory?: string;
  errorMessage?: string;
  cancelledAt?: string;
};
