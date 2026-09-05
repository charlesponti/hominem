// Reducers for the lifecycle stuff that isn't the provider stream or the
// tool-call queue: kicking off a run, cancelling, and the two terminal
// outcomes (saved/failed).

import type { ChatMessageSnapshot } from '../generation-schemas';
import { persistCommand, phaseCommands } from './shared';
import type { GenerationInput, GenerationState, GenerationStep } from './types';

export function reduceStart(
  state: GenerationState,
  input: Extract<GenerationInput, { type: 'start' }>,
): GenerationStep {
  return {
    state: { ...state, phase: 'running', turnId: input.turnId },
    commands: [
      persistCommand(state.generationId, { type: 'generation.started', context: input.context }),
      ...phaseCommands(state.generationId, 'running'),
      { type: 'open-provider-turn', turnId: input.turnId, iteration: 0 },
    ],
  };
}

export function reduceCancelRequested(state: GenerationState): GenerationStep {
  if (state.phase === 'awaiting_confirmation') {
    return {
      state: { ...state, phase: 'cancelled' },
      commands: [persistCommand(state.generationId, { type: 'generation.cancelled' })],
    };
  }
  return {
    state: { ...state, phase: 'cancel_requested' },
    commands: [...phaseCommands(state.generationId, 'cancel_requested'), { type: 'stop-effects' }],
  };
}

export function reduceEffectStopped(state: GenerationState): GenerationStep {
  return {
    state: { ...state, phase: 'cancelled' },
    commands: [persistCommand(state.generationId, { type: 'generation.cancelled' })],
  };
}

export function reduceGenerationSaved(
  state: GenerationState,
  message: ChatMessageSnapshot,
): GenerationStep {
  return {
    state: { ...state, phase: 'committed' },
    commands: [persistCommand(state.generationId, { type: 'generation.committed', message })],
  };
}

export function reduceGenerationFailed(state: GenerationState, message: string): GenerationStep {
  return {
    state: { ...state, phase: 'failed', lastError: message },
    commands: [persistCommand(state.generationId, { type: 'generation.failed', message })],
  };
}
