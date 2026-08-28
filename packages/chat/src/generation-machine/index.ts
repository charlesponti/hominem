/**
 * Provider- and transport-independent generation state machine.
 *
 * The machine is deliberately synchronous and side-effect free. An adapter
 * turns its commands into provider, tool, persistence, and delivery effects.
 *
 * `reduceGeneration` is a thin dispatcher: each branch delegates to the
 * module that owns that piece of state — `lifecycle.ts` (start/cancel/
 * terminal outcomes), `provider.ts` (stream accumulation/retry), or
 * `tool-calls.ts` (the tool-call queue, including turn-completed routing).
 */

import {
  reduceCancelRequested,
  reduceEffectStopped,
  reduceGenerationFailed,
  reduceGenerationSaved,
  reduceStart,
} from './lifecycle';
import { reduceProviderChunk, reduceProviderTurnFailed } from './provider';
import {
  reduceConfirmationApproved,
  reduceConfirmationRejected,
  reduceProviderTurnCompleted,
  reduceToolResult,
} from './tool-calls';
import type {
  GenerationEffectResult,
  GenerationInput,
  GenerationState,
  GenerationStep,
  RunGenerationInput,
} from './types';

export type * from './types';
export { generationEventIdempotencyKey } from './shared';

export function createGenerationState(generationId: string): GenerationState {
  return {
    generationId,
    phase: 'preparing',
    iteration: 0,
    turnId: null,
    assistantText: '',
    reasoningText: '',
    requestedToolCalls: [],
    toolCalls: [],
    pendingToolCalls: [],
    completedToolResults: [],
    activeToolCall: null,
    pendingConfirmation: null,
    lastError: null,
  };
}

export function reduceGeneration(state: GenerationState, input: GenerationInput): GenerationStep {
  if (['committed', 'cancelled', 'failed'].includes(state.phase)) {
    return { state, commands: [] };
  }

  switch (input.type) {
    case 'start':
      return reduceStart(state, input);
    case 'provider-chunk':
      return reduceProviderChunk(state, input.chunk);
    case 'provider-turn-failed':
      return reduceProviderTurnFailed(state, input);
    case 'provider-turn-completed':
      return reduceProviderTurnCompleted(state, input);
    case 'tool-result':
      return reduceToolResult(state, input.result);
    case 'confirmation-approved':
      return reduceConfirmationApproved(state, input);
    case 'confirmation-rejected':
      return reduceConfirmationRejected(state, input);
    case 'cancel-requested':
      return reduceCancelRequested(state);
    case 'effect-stopped':
      return reduceEffectStopped(state);
    case 'generation-saved':
      return reduceGenerationSaved(state, input.message);
    case 'generation-failed':
      return reduceGenerationFailed(state, input.message);
  }
}

async function* asInputs(result: GenerationEffectResult): AsyncIterable<GenerationInput> {
  if (!result) return;
  if (Array.isArray(result)) {
    yield* result;
    return;
  }
  if (isAsyncInputs(result)) {
    yield* result;
    return;
  }
  yield result;
}

function isAsyncInputs(value: object): value is AsyncIterable<GenerationInput> {
  return Symbol.asyncIterator in value && typeof value[Symbol.asyncIterator] === 'function';
}

/**
 * Interpret machine commands serially. The effect interpreter owns all I/O;
 * every effect result is fed back through the pure reducer before the next
 * command runs.
 */
export async function runGeneration(input: RunGenerationInput): Promise<GenerationState> {
  let state = createGenerationState(input.generationId);
  const inputs: GenerationInput[] = [
    input.initialInput ?? {
      type: 'start',
      turnId: `${input.generationId}:0`,
      context: input.startContext,
    },
  ];

  let inputIndex = 0;
  while (inputIndex < inputs.length) {
    const nextInput = inputs[inputIndex++]!;
    const step = reduceGeneration(state, nextInput);
    state = step.state;

    for (const command of step.commands) {
      for await (const effectInput of asInputs(await input.effects.execute(command, state))) {
        inputs.push(effectInput);
      }
    }
  }

  return state;
}
