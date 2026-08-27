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
    save: (state: GenerationState) => void | Promise<void>;
    stop: (state: GenerationState) => void | Promise<void>;
  };
};

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
          return ports.provider.open({
            turnId: command.turnId,
            iteration: command.iteration,
            state,
          });
        case 'retry-provider':
          return ports.provider.retry({ attempt: command.attempt, state });
        case 'execute-tool':
          return {
            type: 'tool-result',
            result: await ports.tools.execute({
              call: command.call,
              idempotencyKey: command.idempotencyKey,
              state,
            }),
          };
        case 'preview-tool':
          await ports.tools.preview({
            call: command.call,
            idempotencyKey: command.idempotencyKey,
            state,
          });
          return;
        case 'save-generation':
          await ports.generation.save(state);
          return { type: 'generation-saved' };
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
    initialInput: input.initialInput,
    effects: createGenerationInterpreter(input.ports),
  });
}
