/** JSON values that can safely cross the durable event boundary. */
export type GenerationJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly GenerationJsonValue[]
  | { readonly [key: string]: GenerationJsonValue };

/** Provider/tool request context retained for a resumable generation. */
export type GenerationRequestContext = {
  readonly [key: string]: GenerationJsonValue;
};

/** Minimal message DTO needed to reconcile optimistic and persisted messages. */
export type GenerationMessageSnapshot = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string | null;
};

/** Stable identity shared by all provider/tool events in one turn. */
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
