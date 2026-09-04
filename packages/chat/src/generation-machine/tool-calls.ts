// Reducers for the tool-call queue: routing a completed provider turn's
// requested calls (either straight through or paused for confirmation),
// running them one at a time, and folding results back in before the next
// provider turn opens.
//
// `reduceProviderTurnCompleted` lives here instead of `provider.ts` because
// it's entirely about the tool-call queue — it just reads
// `state.requestedToolCalls`, which `provider.ts` already built up.

import { reduceGenerationFailed } from './lifecycle';
import { persistCommand, phaseCommands, toolCallIdempotencyKey } from './shared';
import type {
  GenerationHistoryEventPayload,
  GenerationInput,
  GenerationState,
  GenerationStep,
  GenerationToolCall,
  ToolResult,
} from './types';

// Kicks off the next queued call as a running effect — not a dispatch-table entry itself
function runNextToolCall(state: GenerationState, call: GenerationToolCall): GenerationStep {
  return {
    state: {
      ...state,
      activeToolCall: call,
      pendingToolCalls: state.pendingToolCalls.slice(1),
    },
    commands: [
      persistCommand(state.generationId, { type: 'tool.requested', call }),
      {
        type: 'execute-tool',
        call,
        idempotencyKey: toolCallIdempotencyKey(state.generationId, call),
      },
    ],
  };
}

export function reduceProviderTurnCompleted(
  state: GenerationState,
  input: Extract<GenerationInput, { type: 'provider-turn-completed' }>,
): GenerationStep {
  const calls = state.requestedToolCalls.filter((call) => call.name);
  if (calls.length === 0) {
    if (input.requiredToolCall) {
      return reduceGenerationFailed(state, 'The model did not perform the required lookup');
    }
    return {
      state: { ...state, phase: 'saving', requestedToolCalls: [] },
      commands: [...phaseCommands(state.generationId, 'saving'), { type: 'save-generation' }],
    };
  }

  const first = calls[0]!;
  const remaining = calls.slice(1);
  if (input.confirmationCallIds.includes(first.id)) {
    return {
      state: {
        ...state,
        phase: 'awaiting_confirmation',
        requestedToolCalls: calls,
        toolCalls: [...state.toolCalls, ...calls],
        pendingToolCalls: remaining,
        pendingConfirmation: first,
      },
      commands: [
        persistCommand(state.generationId, { type: 'confirmation.required', call: first }),
        ...phaseCommands(state.generationId, 'awaiting_confirmation'),
        {
          type: 'preview-tool',
          call: first,
          idempotencyKey: toolCallIdempotencyKey(state.generationId, first),
        },
      ],
    };
  }
  return runNextToolCall(
    {
      ...state,
      requestedToolCalls: calls,
      toolCalls: [...state.toolCalls, ...calls],
      pendingToolCalls: calls,
    },
    first,
  );
}

export function reduceToolResult(state: GenerationState, result: ToolResult): GenerationStep {
  const nextCall = state.pendingToolCalls[0];
  const resultEvent: GenerationHistoryEventPayload = result.error
    ? { type: 'tool.failed', result }
    : { type: 'tool.completed', result };
  const nextState = {
    ...state,
    activeToolCall: null,
    completedToolResults: [...state.completedToolResults, result],
  };

  if (nextCall) {
    const next = runNextToolCall(nextState, nextCall);
    return {
      state: next.state,
      commands: [persistCommand(state.generationId, resultEvent), ...next.commands],
    };
  }

  const turnId = `${state.generationId}:${state.iteration + 1}`;
  return {
    state: {
      ...nextState,
      phase: 'running',
      iteration: state.iteration + 1,
      turnId,
      requestedToolCalls: [],
    },
    commands: [
      persistCommand(state.generationId, resultEvent),
      ...phaseCommands(state.generationId, 'running'),
      { type: 'open-provider-turn', turnId, iteration: state.iteration + 1 },
    ],
  };
}

export function reduceConfirmationApproved(
  state: GenerationState,
  input: { callId: string },
): GenerationStep {
  if (state.pendingConfirmation?.id !== input.callId) return { state, commands: [] };

  const approved = runNextToolCall(
    {
      ...state,
      phase: 'running',
      pendingConfirmation: null,
      pendingToolCalls: [state.pendingConfirmation, ...state.pendingToolCalls],
    },
    state.pendingConfirmation,
  );
  return {
    state: approved.state,
    commands: [
      persistCommand(state.generationId, { type: 'confirmation.approved', callId: input.callId }),
      ...approved.commands,
    ],
  };
}

export function reduceConfirmationRejected(
  state: GenerationState,
  input: { callId: string; reason: string },
): GenerationStep {
  if (state.pendingConfirmation?.id !== input.callId) return { state, commands: [] };

  const rejected = reduceToolResult(
    { ...state, phase: 'running', pendingConfirmation: null },
    {
      callId: input.callId,
      toolName: state.pendingConfirmation.name,
      content: JSON.stringify({ error: input.reason }),
      error: true,
    },
  );
  return {
    state: rejected.state,
    commands: [
      persistCommand(state.generationId, {
        type: 'confirmation.rejected',
        callId: input.callId,
        reason: input.reason,
      }),
      ...rejected.commands,
    ],
  };
}
