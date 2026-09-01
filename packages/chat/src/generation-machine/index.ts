// A generation state machine that doesn't know or care about the provider or
// transport. It's deliberately synchronous and side-effect free — an adapter
// turns its commands into actual provider, tool, persistence, and delivery
// effects.
//
// `reduceGeneration` is just a dispatcher: each branch hands off to whichever
// module owns that state — `lifecycle.ts` for start/cancel/terminal outcomes,
// `provider.ts` for stream accumulation/retry, `tool-calls.ts` for the
// tool-call queue (including turn-completed routing).

import {
  reduceCancelRequested,
  reduceEffectStopped,
  reduceGenerationFailed,
  reduceGenerationSaved,
  reduceStart,
} from './lifecycle';
import {
  reconstructProviderToolCalls,
  reduceProviderChunk,
  reduceProviderTurnFailed,
} from './provider';
import {
  reduceConfirmationApproved,
  reduceConfirmationRejected,
  reduceProviderTurnCompleted,
  reduceToolResult,
} from './tool-calls';
import type {
  GenerationEffectResult,
  GenerationHistoryEvent,
  GenerationInput,
  GenerationState,
  GenerationStep,
  GenerationToolCall,
  RunGenerationInput,
} from './types';

export type * from './types';
export { reconstructProviderToolCalls };
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

/** Rebuild the machine state needed to continue from durable history. */
export function restoreGenerationState(
  generationId: string,
  events: readonly GenerationHistoryEvent[],
): GenerationState {
  let state = createGenerationState(generationId);
  let pendingCall: GenerationToolCall | null = null;

  for (const event of events) {
    const payload = event.payload;
    switch (payload.type) {
      case 'generation.started':
        state = { ...state, phase: 'running', turnId: `${generationId}:0` };
        break;
      case 'generation.phase_changed':
        state = { ...state, phase: payload.phase };
        break;
      case 'generation.checkpointed':
        state = {
          ...state,
          phase: 'awaiting_confirmation',
          iteration: payload.checkpoint.iteration,
          turnId: payload.checkpoint.turnId,
          assistantText: payload.checkpoint.assistantMessage.content,
          reasoningText: payload.checkpoint.assistantMessage.reasoning ?? '',
        };
        break;
      case 'confirmation.required':
        pendingCall = payload.call;
        state = {
          ...state,
          phase: 'awaiting_confirmation',
          pendingConfirmation: payload.call,
          toolCalls: state.toolCalls.some((call) => call.id === payload.call.id)
            ? state.toolCalls
            : [...state.toolCalls, payload.call],
        };
        break;
      case 'tool.requested':
        state = {
          ...state,
          activeToolCall: payload.call,
          toolCalls: state.toolCalls.some((call) => call.id === payload.call.id)
            ? state.toolCalls
            : [...state.toolCalls, payload.call],
        };
        break;
      case 'tool.completed':
      case 'tool.failed':
        state = {
          ...state,
          activeToolCall: null,
          completedToolResults: state.completedToolResults.some(
            (result) => result.callId === payload.result.callId,
          )
            ? state.completedToolResults
            : [...state.completedToolResults, payload.result],
        };
        break;
      case 'generation.committed':
        state = { ...state, phase: 'committed', pendingConfirmation: null };
        break;
      case 'generation.cancelled':
        state = { ...state, phase: 'cancelled', pendingConfirmation: null };
        break;
      case 'generation.failed':
        state = { ...state, phase: 'failed', lastError: payload.message };
        break;
      case 'generation.cancel_requested':
        state = { ...state, phase: 'cancel_requested' };
        break;
      case 'generation.accepted':
      case 'generation.retry_scheduled':
        break;
      case 'confirmation.approved':
      case 'confirmation.rejected':
        if (pendingCall?.id === payload.callId) pendingCall = null;
        state = {
          ...state,
          phase: 'running',
          pendingConfirmation: null,
        };
        break;
    }
  }

  return pendingCall && state.phase === 'awaiting_confirmation'
    ? { ...state, pendingConfirmation: pendingCall }
    : state;
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

// Runs machine commands one at a time. The effect interpreter handles all
// the I/O; each effect's result gets fed back through the pure reducer
// before the next command runs.
export async function runGeneration(input: RunGenerationInput): Promise<GenerationState> {
  let state = input.initialState ?? createGenerationState(input.generationId);
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
