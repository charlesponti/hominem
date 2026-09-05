import type { GenerationEvent, GenerationLifecycleState } from './generation-machine';
import {
  generationClientCheckpointSchema,
  type GenerationClientCheckpoint,
} from './generation-schemas';

export type { GenerationClientCheckpoint } from './generation-schemas';

export type GenerationClientToolStep = {
  toolCallId: string;
  toolName: string;
  status: 'requested' | 'running' | 'completed' | 'failed' | 'reused';
};

export type GenerationClientState = GenerationLifecycleState & {
  text: string;
  reasoning: string;
  toolSteps: readonly GenerationClientToolStep[];
  lastDurableSequence: number;
  error: string | null;
};

export function toGenerationClientCheckpoint(
  state: GenerationClientState,
): GenerationClientCheckpoint {
  return generationClientCheckpointSchema.parse({
    generationId: state.generationId,
    phase: state.phase,
    lastDurableSequence: state.lastDurableSequence,
  });
}

export function parseGenerationClientCheckpoint(input: unknown): GenerationClientCheckpoint {
  return generationClientCheckpointSchema.parse(input);
}

// A client-local, transport-failure signal (e.g. the SSE connection itself
// dropped) — deliberately decoupled from the wire contract, since it never
// had a server-side counterpart to derive from.
export type GenerationClientErrorEvent = {
  version: 1;
  generationId: string;
  event: { type: 'error'; message: string };
};

export type GenerationClientInputEvent = GenerationEvent | GenerationClientErrorEvent;

export function createGenerationClientState(generationId: string): GenerationClientState {
  return {
    generationId,
    phase: 'preparing',
    text: '',
    reasoning: '',
    toolSteps: [],
    lastDurableSequence: 0,
    error: null,
  };
}

function updateToolStep(
  steps: readonly GenerationClientToolStep[],
  nextStep: GenerationClientToolStep,
): readonly GenerationClientToolStep[] {
  const index = steps.findIndex((step) => step.toolCallId === nextStep.toolCallId);
  if (index === -1) return [...steps, nextStep];
  return steps.map((step, stepIndex) => (stepIndex === index ? nextStep : step));
}

export function reduceGenerationClientEvent(
  state: GenerationClientState,
  event: GenerationClientInputEvent,
): GenerationClientState {
  if (event.generationId !== state.generationId) return state;

  if ('event' in event) {
    // GenerationClientErrorEvent — see its type definition above.
    return { ...state, phase: 'failed', error: event.event.message };
  }

  if (event.sequence !== null) {
    if (event.sequence <= state.lastDurableSequence) return state;
    state = { ...state, lastDurableSequence: event.sequence };
  }

  switch (event.payload.type) {
    case 'text-delta':
      return { ...state, text: state.text + event.payload.text };
    case 'reasoning-delta':
      return { ...state, reasoning: state.reasoning + event.payload.text };
    case 'generation.phase_changed':
      return { ...state, phase: event.payload.phase };
    case 'generation.cancel_requested':
      return { ...state, phase: 'cancel_requested' };
    case 'tool.requested':
      return {
        ...state,
        toolSteps: updateToolStep(state.toolSteps, {
          toolCallId: event.payload.call.id,
          toolName: event.payload.call.name,
          status: 'requested',
        }),
      };
    case 'tool.completed':
    case 'tool.failed':
      return {
        ...state,
        toolSteps: updateToolStep(state.toolSteps, {
          toolCallId: event.payload.result.callId,
          toolName: event.payload.result.toolName,
          status: event.payload.type === 'tool.completed' ? 'completed' : 'failed',
        }),
      };
    case 'confirmation.required':
      return { ...state, phase: 'awaiting_confirmation' };
    case 'generation.retry_scheduled':
      return { ...state, phase: 'running' };
    case 'generation.committed':
      return {
        ...state,
        phase: 'committed',
        text: event.payload.message.content,
        reasoning: event.payload.message.reasoning ?? state.reasoning,
      };
    case 'generation.cancelled':
      return { ...state, phase: 'cancelled' };
    case 'generation.failed':
      return { ...state, phase: 'failed', error: event.payload.message };
    case 'generation.started':
    case 'generation.accepted':
    case 'generation.checkpointed':
    case 'confirmation.approved':
    case 'confirmation.rejected':
      return state;
  }
}
