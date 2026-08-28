import type { GenerationMessageSnapshot } from './generation-events';
import {
  runGeneration,
  type GenerationCommand,
  type GenerationEffectInterpreter,
  type GenerationInput,
  type GenerationLiveEventPayload,
  type GenerationState,
  type GenerationToolCall,
  type RunGenerationInput,
  type ToolResult,
} from './generation-machine';

export type GenerationPorts = {
  control?: {
    isCancelled?: (state: GenerationState) => boolean | Promise<boolean>;
    waitBeforeRetry?: (input: { attempt: number; state: GenerationState }) => void | Promise<void>;
  };
  provider: {
    open: (input: {
      turnId: string;
      iteration: number;
      state: GenerationState;
    }) => AsyncIterable<GenerationInput> | Promise<AsyncIterable<GenerationInput>>;
    retry: (input: {
      attempt: number;
      state: GenerationState;
    }) => GenerationInput | AsyncIterable<GenerationInput> | Promise<GenerationInput>;
    appendToolResult?: (input: {
      call: GenerationToolCall;
      result: ToolResult;
      state: GenerationState;
    }) => void | Promise<void>;
  };
  tools: {
    execute: (input: {
      call: GenerationToolCall;
      idempotencyKey: string;
      state: GenerationState;
    }) => ToolResult | Promise<ToolResult>;
    preview: (input: {
      call: GenerationToolCall;
      idempotencyKey: string;
      state: GenerationState;
    }) => ToolResult | Promise<ToolResult>;
  };
  events: {
    persist: (
      command: Extract<GenerationCommand, { type: 'persist' }>,
      state: GenerationState,
    ) => void | Promise<void>;
    emit: (event: GenerationLiveEventPayload, state: GenerationState) => void | Promise<void>;
  };
  generation: {
    save: (
      state: GenerationState,
    ) => GenerationMessageSnapshot | Promise<GenerationMessageSnapshot>;
    stop: (state: GenerationState) => void | Promise<void>;
  };
};

async function isCancelled(ports: GenerationPorts, state: GenerationState): Promise<boolean> {
  return (await ports.control?.isCancelled?.(state)) ?? false;
}

async function* monitorProviderInputs(
  inputs: GenerationInput | AsyncIterable<GenerationInput>,
  ports: GenerationPorts,
  state: GenerationState,
): AsyncIterable<GenerationInput> {
  if (isAsyncIterable(inputs)) {
    for await (const input of inputs) {
      if (await isCancelled(ports, state)) {
        yield { type: 'cancel-requested' };
        return;
      }
      yield input;
    }
    return;
  }

  if (await isCancelled(ports, state)) {
    yield { type: 'cancel-requested' };
    return;
  }
  yield inputs;
}

function isAsyncIterable(value: object): value is AsyncIterable<GenerationInput> {
  return Symbol.asyncIterator in value && typeof value[Symbol.asyncIterator] === 'function';
}

export function createGenerationInterpreter(ports: GenerationPorts): GenerationEffectInterpreter {
  return {
    async execute(command, state) {
      switch (command.type) {
        case 'persist':
          await ports.events.persist(command, state);
          return;
        case 'emit':
          await ports.events.emit(command.event, state);
          return;
        case 'open-provider-turn':
          return monitorProviderInputs(
            await ports.provider.open({
              turnId: command.turnId,
              iteration: command.iteration,
              state,
            }),
            ports,
            state,
          );
        case 'retry-provider':
          await ports.control?.waitBeforeRetry?.({ attempt: command.attempt, state });
          return monitorProviderInputs(
            await ports.provider.retry({ attempt: command.attempt, state }),
            ports,
            state,
          );
        case 'execute-tool': {
          if (await isCancelled(ports, state)) return { type: 'cancel-requested' };
          const result = await ports.tools.execute({
            call: command.call,
            idempotencyKey: command.idempotencyKey,
            state,
          });
          await ports.provider.appendToolResult?.({ call: command.call, result, state });
          return { type: 'tool-result', result };
        }
        case 'preview-tool':
          if (await isCancelled(ports, state)) return { type: 'cancel-requested' };
          await ports.tools.preview({
            call: command.call,
            idempotencyKey: command.idempotencyKey,
            state,
          });
          return;
        case 'save-generation':
          if (await isCancelled(ports, state)) return { type: 'cancel-requested' };
          return { type: 'generation-saved', message: await ports.generation.save(state) };
        case 'stop-effects':
          await ports.generation.stop(state);
          return { type: 'effect-stopped' };
      }
    },
  };
}

export function runGenerationWithPorts(
  input: Omit<RunGenerationInput, 'effects'> & { ports: GenerationPorts },
): Promise<GenerationState> {
  return runGeneration({
    generationId: input.generationId,
    startContext: input.startContext,
    initialInput: input.initialInput,
    effects: createGenerationInterpreter(input.ports),
  });
}
