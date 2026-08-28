/**
 * Reducers for the provider stream: text/reasoning accumulation, in-flight
 * tool-call fragment merging, and transient-retry vs terminal-failure
 * handling. This module never inspects the tool-call queue — routing a
 * completed turn's tool calls belongs to `tool-calls.ts`.
 */

import { reduceGenerationFailed } from './lifecycle';
import { persistCommand } from './shared';
import type {
  GenerationCommand,
  GenerationInput,
  GenerationState,
  GenerationStep,
  GenerationToolCall,
  ProviderChunk,
  ProviderToolCallDelta,
} from './types';

function mergeToolCall(
  current: GenerationToolCall | undefined,
  delta: ProviderToolCallDelta,
  state: GenerationState,
): GenerationToolCall {
  return {
    id: delta.id || current?.id || '',
    name: delta.function?.name || current?.name || '',
    arguments: `${current?.arguments ?? ''}${delta.function?.arguments ?? ''}`,
    iteration: state.iteration,
    turnId: state.turnId ?? 'unknown',
  };
}

export function reduceProviderChunk(state: GenerationState, chunk: ProviderChunk): GenerationStep {
  const calls = new Map(state.requestedToolCalls.map((call, index) => [index, call]));
  for (const delta of chunk.toolCalls ?? []) {
    calls.set(delta.index, mergeToolCall(calls.get(delta.index), delta, state));
  }

  const commands: GenerationCommand[] = [];
  if (chunk.content)
    commands.push({ type: 'emit', event: { type: 'text-delta', text: chunk.content } });
  if (chunk.reasoning) {
    commands.push({ type: 'emit', event: { type: 'reasoning-delta', text: chunk.reasoning } });
  }

  return {
    state: {
      ...state,
      assistantText: chunk.content ? state.assistantText + chunk.content : state.assistantText,
      reasoningText: chunk.reasoning ? state.reasoningText + chunk.reasoning : state.reasoningText,
      requestedToolCalls: [...calls.entries()]
        .sort(([left], [right]) => left - right)
        .map(([, call]) => call),
    },
    commands,
  };
}

export function reduceProviderTurnFailed(
  state: GenerationState,
  input: Extract<GenerationInput, { type: 'provider-turn-failed' }>,
): GenerationStep {
  if (input.transient && input.attempt < input.maxAttempts) {
    return {
      state,
      commands: [
        persistCommand(state.generationId, {
          type: 'generation.retry_scheduled',
          attempt: input.attempt + 1,
          maxAttempts: input.maxAttempts,
        }),
        { type: 'retry-provider', attempt: input.attempt + 1 },
      ],
    };
  }
  return reduceGenerationFailed(state, input.message);
}
