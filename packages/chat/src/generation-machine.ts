/**
 * Provider- and transport-independent generation state machine.
 *
 * The machine is deliberately synchronous and side-effect free. An adapter
 * turns its commands into provider, tool, persistence, and delivery effects.
 */

import type {
  GenerationCheckpoint,
  GenerationMessageSnapshot,
  GenerationRequestContext,
  GenerationRetryMetadata,
  GenerationTerminalMetadata,
} from './generation-events';

export type GenerationPhase =
  | 'preparing'
  | 'running'
  | 'awaiting_confirmation'
  | 'saving'
  | 'cancel_requested'
  | 'committed'
  | 'cancelled'
  | 'failed';

export type ChatGenerationKind = 'send' | 'start' | 'regenerate';
export type ChatGenerationStatus = GenerationPhase | 'queued';

export type GenerationToolCall = {
  id: string;
  name: string;
  arguments: string;
  iteration: number;
  turnId: string;
};

export type ProviderToolCallDelta = {
  index: number;
  id?: string | null;
  function?: { name?: string | null; arguments?: string | null } | null;
};

export type ProviderChunk = {
  content?: string | null;
  reasoning?: string | null;
  toolCalls?: readonly ProviderToolCallDelta[];
};

export type ToolResult = {
  callId: string;
  toolName: string;
  content: string;
  error: boolean;
};

export type GenerationState = {
  generationId: string;
  phase: GenerationPhase;
  iteration: number;
  turnId: string | null;
  assistantText: string;
  reasoningText: string;
  requestedToolCalls: readonly GenerationToolCall[];
  pendingToolCalls: readonly GenerationToolCall[];
  completedToolResults: readonly ToolResult[];
  activeToolCall: GenerationToolCall | null;
  pendingConfirmation: GenerationToolCall | null;
  lastError: string | null;
};

export type GenerationEventPayload =
  | {
      type: 'generation.started';
      generationId: string;
      context?: {
        chatId: string;
        kind: ChatGenerationKind;
        userMessageId: string | null;
        requestContext: GenerationRequestContext;
      };
    }
  | {
      type: 'generation.accepted';
      chatId: string;
      userMessage: GenerationMessageSnapshot;
    }
  | { type: 'generation.phase_changed'; phase: GenerationPhase }
  | { type: 'generation.cancel_requested'; requestedAt: string; requestedBy: string }
  | { type: 'generation.checkpointed'; checkpoint: GenerationCheckpoint }
  | { type: 'tool.requested'; call: GenerationToolCall }
  | { type: 'tool.completed'; result: ToolResult }
  | { type: 'tool.failed'; result: ToolResult }
  | { type: 'confirmation.required'; call: GenerationToolCall }
  | { type: 'confirmation.approved'; callId: string; call?: GenerationToolCall }
  | { type: 'confirmation.rejected'; callId: string; reason: string; call?: GenerationToolCall }
  | {
      type: 'generation.retry_scheduled';
      attempt: number;
      maxAttempts: number;
      metadata?: GenerationRetryMetadata;
    }
  | { type: 'generation.committed'; metadata?: GenerationTerminalMetadata }
  | { type: 'generation.cancelled'; metadata?: GenerationTerminalMetadata }
  | { type: 'generation.failed'; message: string; metadata?: GenerationTerminalMetadata };

export type GenerationEventType = GenerationEventPayload['type'];

export type GenerationDomainEvent = {
  [Payload in GenerationEventPayload as Payload['type']]: {
    version: 1;
    generationId: string;
    sequence: number;
    type: Payload['type'];
    payload: Payload;
  };
}[GenerationEventType];

export type GenerationLiveEventPayload =
  | { type: 'text-delta'; text: string }
  | { type: 'reasoning-delta'; text: string }
  | {
      type: 'tool-step';
      toolCallId: string;
      toolName: string;
      status: 'requested' | 'running' | 'completed' | 'failed' | 'reused';
    }
  | { type: 'phase-changed'; phase: GenerationPhase };

export type GenerationLiveEvent = {
  version: 1;
  generationId: string;
  event: GenerationLiveEventPayload;
};

export type GenerationInput =
  | { type: 'start'; turnId: string }
  | { type: 'provider-chunk'; chunk: ProviderChunk }
  | {
      type: 'provider-turn-completed';
      requiredToolCall: boolean;
      confirmationCallIds: readonly string[];
    }
  | {
      type: 'provider-turn-failed';
      message: string;
      transient: boolean;
      attempt: number;
      maxAttempts: number;
    }
  | { type: 'tool-result'; result: ToolResult }
  | { type: 'confirmation-approved'; callId: string }
  | { type: 'confirmation-rejected'; callId: string; reason: string }
  | { type: 'cancel-requested' }
  | { type: 'effect-stopped' }
  | { type: 'generation-saved' }
  | { type: 'generation-failed'; message: string };

export type GenerationCommand =
  | { type: 'persist'; event: GenerationEventPayload }
  | { type: 'emit'; event: GenerationLiveEventPayload }
  | { type: 'open-provider-turn'; turnId: string; iteration: number }
  | { type: 'execute-tool'; call: GenerationToolCall; idempotencyKey: string }
  | { type: 'preview-tool'; call: GenerationToolCall; idempotencyKey: string }
  | { type: 'retry-provider'; attempt: number }
  | { type: 'save-generation' }
  | { type: 'stop-effects' };

export type GenerationStep = { state: GenerationState; commands: readonly GenerationCommand[] };

export type GenerationEffectResult =
  | GenerationInput
  | AsyncIterable<GenerationInput>
  | readonly GenerationInput[]
  | undefined;

export type GenerationEffectInterpreter = {
  execute: (command: GenerationCommand, state: GenerationState) => Promise<GenerationEffectResult>;
};

export type RunGenerationInput = {
  generationId: string;
  effects: GenerationEffectInterpreter;
  initialInput?: GenerationInput;
};

export function createGenerationState(generationId: string): GenerationState {
  return {
    generationId,
    phase: 'preparing',
    iteration: 0,
    turnId: null,
    assistantText: '',
    reasoningText: '',
    requestedToolCalls: [],
    pendingToolCalls: [],
    completedToolResults: [],
    activeToolCall: null,
    pendingConfirmation: null,
    lastError: null,
  };
}

async function* asInputs(result: GenerationEffectResult): AsyncIterable<GenerationInput> {
  if (!result) return;
  if (Array.isArray(result)) {
    yield* result;
    return;
  }
  if (typeof result === 'object' && Symbol.asyncIterator in result) {
    yield* result as AsyncIterable<GenerationInput>;
    return;
  }
  yield result as GenerationInput;
}

/**
 * Interpret machine commands serially. The effect interpreter owns all I/O;
 * every effect result is fed back through the pure reducer before the next
 * command runs.
 */
export async function runGeneration(input: RunGenerationInput): Promise<GenerationState> {
  let state = createGenerationState(input.generationId);
  const inputs: GenerationInput[] = [
    input.initialInput ?? { type: 'start', turnId: `${input.generationId}:0` },
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

function phaseCommands(phase: GenerationPhase): GenerationCommand[] {
  return [
    { type: 'persist', event: { type: 'generation.phase_changed', phase } },
    { type: 'emit', event: { type: 'phase-changed', phase } },
  ];
}

function idempotencyKey(state: GenerationState, call: GenerationToolCall): string {
  return `${state.generationId}:${call.turnId}:${call.id}`;
}

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

function reduceProviderChunk(state: GenerationState, chunk: ProviderChunk): GenerationStep {
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

function executeNextTool(state: GenerationState, call: GenerationToolCall): GenerationStep {
  return {
    state: {
      ...state,
      activeToolCall: call,
      pendingToolCalls: state.pendingToolCalls.slice(1),
    },
    commands: [
      { type: 'persist', event: { type: 'tool.requested', call } },
      {
        type: 'emit',
        event: { type: 'tool-step', toolCallId: call.id, toolName: call.name, status: 'requested' },
      },
      { type: 'execute-tool', call, idempotencyKey: idempotencyKey(state, call) },
    ],
  };
}

function finishTool(state: GenerationState, result: ToolResult): GenerationStep {
  const nextCall = state.pendingToolCalls[0];
  const resultEvent: GenerationEventPayload = result.error
    ? { type: 'tool.failed', result }
    : { type: 'tool.completed', result };
  const liveEvent: GenerationLiveEventPayload = {
    type: 'tool-step',
    toolCallId: result.callId,
    toolName: result.toolName,
    status: result.error ? 'failed' : 'completed',
  };
  const nextState = {
    ...state,
    activeToolCall: null,
    completedToolResults: [...state.completedToolResults, result],
  };

  if (nextCall) {
    const next = executeNextTool(nextState, nextCall);
    return {
      state: next.state,
      commands: [
        { type: 'persist', event: resultEvent },
        { type: 'emit', event: liveEvent },
        ...next.commands,
      ],
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
      { type: 'persist', event: resultEvent },
      { type: 'emit', event: liveEvent },
      ...phaseCommands('running'),
      { type: 'open-provider-turn', turnId, iteration: state.iteration + 1 },
    ],
  };
}

export function reduceGeneration(state: GenerationState, input: GenerationInput): GenerationStep {
  if (['committed', 'cancelled', 'failed'].includes(state.phase)) {
    return { state, commands: [] };
  }

  switch (input.type) {
    case 'start':
      return {
        state: { ...state, phase: 'running', turnId: input.turnId },
        commands: [
          {
            type: 'persist',
            event: { type: 'generation.started', generationId: state.generationId },
          },
          ...phaseCommands('running'),
          { type: 'open-provider-turn', turnId: input.turnId, iteration: 0 },
        ],
      };
    case 'provider-chunk':
      return reduceProviderChunk(state, input.chunk);
    case 'provider-turn-failed':
      if (input.transient && input.attempt < input.maxAttempts) {
        return {
          state,
          commands: [
            {
              type: 'persist',
              event: {
                type: 'generation.retry_scheduled',
                attempt: input.attempt + 1,
                maxAttempts: input.maxAttempts,
              },
            },
            { type: 'retry-provider', attempt: input.attempt + 1 },
          ],
        };
      }
      return reduceGeneration(state, { type: 'generation-failed', message: input.message });
    case 'provider-turn-completed': {
      const calls = state.requestedToolCalls.filter((call) => call.name);
      if (calls.length === 0) {
        if (input.requiredToolCall) {
          return {
            state: {
              ...state,
              phase: 'failed',
              lastError: 'The model did not perform the required lookup',
            },
            commands: [
              {
                type: 'persist',
                event: {
                  type: 'generation.failed',
                  message: 'The model did not perform the required lookup',
                },
              },
              ...phaseCommands('failed'),
            ],
          };
        }
        return {
          state: { ...state, phase: 'saving', requestedToolCalls: [] },
          commands: [...phaseCommands('saving'), { type: 'save-generation' }],
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
            pendingToolCalls: remaining,
            pendingConfirmation: first,
          },
          commands: [
            { type: 'persist', event: { type: 'confirmation.required', call: first } },
            ...phaseCommands('awaiting_confirmation'),
            { type: 'preview-tool', call: first, idempotencyKey: idempotencyKey(state, first) },
          ],
        };
      }
      return executeNextTool(
        { ...state, requestedToolCalls: calls, pendingToolCalls: calls },
        first,
      );
    }
    case 'tool-result':
      return finishTool(state, input.result);
    case 'confirmation-approved':
      if (state.pendingConfirmation?.id !== input.callId) return { state, commands: [] };
      {
        const approved = executeNextTool(
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
            { type: 'persist', event: { type: 'confirmation.approved', callId: input.callId } },
            ...approved.commands,
          ],
        };
      }
    case 'confirmation-rejected':
      if (state.pendingConfirmation?.id !== input.callId) return { state, commands: [] };
      const rejected = finishTool(
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
          {
            type: 'persist',
            event: { type: 'confirmation.rejected', callId: input.callId, reason: input.reason },
          },
          ...rejected.commands,
        ],
      };
    case 'cancel-requested':
      if (state.phase === 'awaiting_confirmation') {
        return {
          state: { ...state, phase: 'cancelled' },
          commands: [
            { type: 'persist', event: { type: 'generation.cancelled' } },
            ...phaseCommands('cancelled'),
          ],
        };
      }
      return {
        state: { ...state, phase: 'cancel_requested' },
        commands: [...phaseCommands('cancel_requested'), { type: 'stop-effects' }],
      };
    case 'effect-stopped':
      return {
        state: { ...state, phase: 'cancelled' },
        commands: [
          { type: 'persist', event: { type: 'generation.cancelled' } },
          ...phaseCommands('cancelled'),
        ],
      };
    case 'generation-saved':
      return {
        state: { ...state, phase: 'committed' },
        commands: [
          { type: 'persist', event: { type: 'generation.committed' } },
          ...phaseCommands('committed'),
        ],
      };
    case 'generation-failed':
      return {
        state: { ...state, phase: 'failed', lastError: input.message },
        commands: [
          { type: 'persist', event: { type: 'generation.failed', message: input.message } },
          ...phaseCommands('failed'),
        ],
      };
  }
}
