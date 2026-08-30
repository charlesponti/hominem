import type {
  GenerationHistoryEvent,
  GenerationPhase,
  GenerationStreamEvent,
} from './generation-machine';

export type GenerationClientToolStep = {
  toolCallId: string;
  toolName: string;
  status: 'requested' | 'running' | 'completed' | 'failed' | 'reused';
};

export type GenerationClientState = {
  generationId: string;
  phase: GenerationPhase;
  text: string;
  reasoning: string;
  toolSteps: readonly GenerationClientToolStep[];
  lastDurableSequence: number;
  error: string | null;
};

export type GenerationClientEvent = GenerationHistoryEvent | GenerationStreamEvent;

export type GenerationClientErrorEvent = {
  version: 1;
  generationId: string;
  event: { type: 'error'; message: string };
};

export type GenerationClientInputEvent = GenerationClientEvent | GenerationClientErrorEvent;

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

function isDuplicateDurableEvent(
  state: GenerationClientState,
  event: GenerationHistoryEvent,
): boolean {
  return event.sequence <= state.lastDurableSequence;
}

export function reduceGenerationClientEvent(
  state: GenerationClientState,
  event: GenerationClientInputEvent,
): GenerationClientState {
  if (event.generationId !== state.generationId) return state;

  if ('sequence' in event) {
    if (isDuplicateDurableEvent(state, event)) return state;
    state = { ...state, lastDurableSequence: event.sequence };
  }

  if ('event' in event) {
    switch (event.event.type) {
      case 'text-delta':
        return { ...state, text: state.text + event.event.text };
      case 'reasoning-delta':
        return { ...state, reasoning: state.reasoning + event.event.text };
      case 'tool-step':
        return {
          ...state,
          toolSteps: updateToolStep(state.toolSteps, {
            toolCallId: event.event.toolCallId,
            toolName: event.event.toolName,
            status: event.event.status,
          }),
        };
      case 'phase-changed':
        return { ...state, phase: event.event.phase };
      case 'error':
        return { ...state, phase: 'failed', error: event.event.message };
    }
  }

  switch (event.payload.type) {
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
