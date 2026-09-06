// Bridges the pure state machine (./generation-machine) to real side effects.
// The machine itself never calls a provider, writes to a DB, or emits an SSE
// event directly — running it just returns GenerationCommands (declarative
// instructions like "persist this event" or "open a provider turn"). This
// file's GenerationAdapters are the injected implementations of each command
// type, and createGenerationInterpreter turns a command back into the
// machine's next input by awaiting the matching adapter. That split is what
// lets the machine be tested with no I/O at all, and lets the same machine
// run against different concrete adapters (e.g. real provider/DB in
// services/api vs fake adapters in tests).
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
import type { ChatMessageSnapshot } from './generation-schemas';
import { GENERATION_TIMING } from './generation-timing';

export type GenerationAdapters = {
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
    save: (state: GenerationState) => ChatMessageSnapshot | Promise<ChatMessageSnapshot>;
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

async function isCancelled(adapters: GenerationAdapters, state: GenerationState): Promise<boolean> {
  return (await adapters.control?.isCancelled?.(state)) ?? false;
}

async function* monitorProviderInputs(
  inputs: GenerationInput | AsyncIterable<GenerationInput>,
  adapters: GenerationAdapters,
  state: GenerationState,
): AsyncIterable<GenerationInput> {
  if (isAsyncIterable(inputs)) {
    for await (const input of inputs) {
      if (await isCancelled(adapters, state)) {
        yield { type: 'cancel-requested' };
        return;
      }
      yield input;
    }
    return;
  }

  if (await isCancelled(adapters, state)) {
    yield { type: 'cancel-requested' };
    return;
  }
  yield inputs;
}

function isAsyncIterable(value: object): value is AsyncIterable<GenerationInput> {
  return Symbol.asyncIterator in value && typeof value[Symbol.asyncIterator] === 'function';
}

export function createGenerationInterpreter(
  adapters: GenerationAdapters,
  options?: { effectTimeoutsMs?: Partial<Record<GenerationCommand['type'], number>> },
): GenerationEffectInterpreter {
  const timeouts = { ...DEFAULT_EFFECT_TIMEOUTS_MS, ...options?.effectTimeoutsMs };
  return {
    async execute(command, state) {
      switch (command.type) {
        case 'persist':
          await withEffectTimeout('persist', timeouts.persist, () =>
            adapters.events.persist(command, state),
          );
          return;
        case 'emit':
          await adapters.events.emit(command.event, state);
          return;
        case 'open-provider-turn':
          return monitorProviderInputs(
            await adapters.provider.open({
              turnId: command.turnId,
              iteration: command.iteration,
              state,
            }),
            adapters,
            state,
          );
        case 'retry-provider':
          await adapters.control?.waitBeforeRetry?.({ attempt: command.attempt, state });
          return monitorProviderInputs(
            await adapters.provider.retry({ attempt: command.attempt, state }),
            adapters,
            state,
          );
        case 'execute-tool': {
          if (await isCancelled(adapters, state)) return { type: 'cancel-requested' };
          const result = await withEffectTimeout('execute-tool', timeouts['execute-tool'], () =>
            adapters.tools.execute({
              call: command.call,
              idempotencyKey: command.idempotencyKey,
              state,
            }),
          );
          await adapters.provider.appendToolResult?.({ call: command.call, result, state });
          return { type: 'tool-result', result };
        }
        case 'preview-tool':
          if (await isCancelled(adapters, state)) return { type: 'cancel-requested' };
          await withEffectTimeout('preview-tool', timeouts['preview-tool'], () =>
            adapters.tools.preview({
              call: command.call,
              idempotencyKey: command.idempotencyKey,
              state,
            }),
          );
          return;
        case 'save-generation':
          if (await isCancelled(adapters, state)) return { type: 'cancel-requested' };
          return {
            type: 'generation-saved',
            message: await withEffectTimeout('save-generation', timeouts['save-generation'], () =>
              adapters.generation.save(state),
            ),
          };
        case 'stop-effects':
          await adapters.generation.stop(state);
          return { type: 'effect-stopped' };
      }
    },
  };
}

export function generate(
  input: Omit<RunGenerationInput, 'effects'> & {
    adapters: GenerationAdapters;
    effectTimeoutsMs?: Partial<Record<GenerationCommand['type'], number>>;
  },
): Promise<GenerationState> {
  return runGeneration({
    generationId: input.generationId,
    startContext: input.startContext,
    initialInput: input.initialInput,
    initialState: input.initialState,
    effects: createGenerationInterpreter(input.adapters, {
      effectTimeoutsMs: input.effectTimeoutsMs,
    }),
  });
}
