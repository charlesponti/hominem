import type { GenerationHistoryMessageSnapshot } from './generation-events';
import {
  runGeneration,
  type GenerationCommand,
  type GenerationDeltaEventPayload,
  type GenerationEffectInterpreter,
  type GenerationInput,
  type GenerationState,
  type GenerationToolCall,
  type RunGenerationInput,
  type ToolResult,
} from './generation-machine';
import { GENERATION_TIMING } from './generation-timing';

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
    emit: (event: GenerationDeltaEventPayload, state: GenerationState) => void | Promise<void>;
  };
  generation: {
    save: (
      state: GenerationState,
    ) => GenerationHistoryMessageSnapshot | Promise<GenerationHistoryMessageSnapshot>;
    stop: (state: GenerationState) => void | Promise<void>;
  };
};

export class EffectCommandTimeoutError extends Error {
  constructor(
    readonly commandType: GenerationCommand['type'],
    ms: number,
  ) {
    super(`Effect command "${commandType}" did not complete within ${ms}ms`);
    this.name = 'EffectCommandTimeoutError';
  }
}

// Only the I/O-bound branches that can genuinely hang forever with nothing
// left to emit are timed — `open-provider-turn`/`retry-provider` are already
// covered by the OpenRouter provider's own idle timeout, and `emit`/
// `stop-effects` are in-process, not arbitrary I/O, today. See
// GENERATION_TIMING for the full timeout policy.
export const DEFAULT_EFFECT_TIMEOUTS_MS: Partial<Record<GenerationCommand['type'], number>> = {
  persist: GENERATION_TIMING.effectMs.persist,
  'execute-tool': GENERATION_TIMING.effectMs.executeTool,
  'preview-tool': GENERATION_TIMING.effectMs.previewTool,
  'save-generation': GENERATION_TIMING.effectMs.saveGeneration,
};

async function withEffectTimeout<T>(
  commandType: GenerationCommand['type'],
  ms: number | undefined,
  run: () => T | Promise<T>,
): Promise<T> {
  if (!ms) return run();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new EffectCommandTimeoutError(commandType, ms)), ms);
  });
  try {
    return await Promise.race([Promise.resolve(run()), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

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

export function createGenerationInterpreter(
  ports: GenerationPorts,
  options?: { effectTimeoutsMs?: Partial<Record<GenerationCommand['type'], number>> },
): GenerationEffectInterpreter {
  const timeouts = { ...DEFAULT_EFFECT_TIMEOUTS_MS, ...options?.effectTimeoutsMs };
  return {
    async execute(command, state) {
      switch (command.type) {
        case 'persist':
          await withEffectTimeout('persist', timeouts.persist, () =>
            ports.events.persist(command, state),
          );
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
          const result = await withEffectTimeout('execute-tool', timeouts['execute-tool'], () =>
            ports.tools.execute({
              call: command.call,
              idempotencyKey: command.idempotencyKey,
              state,
            }),
          );
          await ports.provider.appendToolResult?.({ call: command.call, result, state });
          return { type: 'tool-result', result };
        }
        case 'preview-tool':
          if (await isCancelled(ports, state)) return { type: 'cancel-requested' };
          await withEffectTimeout('preview-tool', timeouts['preview-tool'], () =>
            ports.tools.preview({
              call: command.call,
              idempotencyKey: command.idempotencyKey,
              state,
            }),
          );
          return;
        case 'save-generation':
          if (await isCancelled(ports, state)) return { type: 'cancel-requested' };
          return {
            type: 'generation-saved',
            message: await withEffectTimeout('save-generation', timeouts['save-generation'], () =>
              ports.generation.save(state),
            ),
          };
        case 'stop-effects':
          await ports.generation.stop(state);
          return { type: 'effect-stopped' };
      }
    },
  };
}

export function runGenerationWithPorts(
  input: Omit<RunGenerationInput, 'effects'> & {
    ports: GenerationPorts;
    effectTimeoutsMs?: Partial<Record<GenerationCommand['type'], number>>;
  },
): Promise<GenerationState> {
  return runGeneration({
    generationId: input.generationId,
    startContext: input.startContext,
    initialInput: input.initialInput,
    initialState: input.initialState,
    effects: createGenerationInterpreter(input.ports, {
      effectTimeoutsMs: input.effectTimeoutsMs,
    }),
  });
}
