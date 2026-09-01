import type { GenerationStartContext } from './generation-events';
import { runGenerationWithPorts, type GenerationPorts } from './generation-interpreter';
import type {
  GenerationInput,
  GenerationState,
  GenerationToolCall,
  ToolResult,
} from './generation-machine';

// The model boundary the chat SDK talks to — a provider just opens turns and
// gets tool results back, it doesn't own the generation lifecycle
export type ChatModel = GenerationPorts['provider'];

// The tool boundary owned by the application
export type ChatTools = GenerationPorts['tools'];

// Persistence and delivery deps supplied by the host app
export type ChatGenerationLifecycle = {
  events: GenerationPorts['events'];
  generation: GenerationPorts['generation'];
  control?: GenerationPorts['control'];
};

export type ChatOptions = {
  model: ChatModel;
  tools: ChatTools;
  lifecycle: ChatGenerationLifecycle;
};

export type CreateGenerationInput = {
  id: string;
  context: GenerationStartContext;
  initialInput?: GenerationInput;
};

export type Generation = {
  readonly id: string;
  readonly context: GenerationStartContext;
  readonly state: GenerationState | null;
  run: () => Promise<GenerationState>;
};

class GenerationResource implements Generation {
  readonly id: string;
  readonly context: GenerationStartContext;
  private currentState: GenerationState | null = null;
  private runPromise: Promise<GenerationState> | null = null;

  constructor(
    private readonly options: ChatOptions,
    private readonly input: CreateGenerationInput,
  ) {
    this.id = input.id;
    this.context = input.context;
  }

  get state(): GenerationState | null {
    return this.currentState;
  }

  run(): Promise<GenerationState> {
    if (!this.runPromise) {
      this.runPromise = runGenerationWithPorts({
        generationId: this.input.id,
        startContext: this.input.context,
        initialInput: this.input.initialInput,
        ports: {
          provider: this.options.model,
          tools: this.options.tools,
          events: this.options.lifecycle.events,
          control: this.options.lifecycle.control,
          generation: {
            save: async (state) => this.options.lifecycle.generation.save(state),
            stop: async (state) => this.options.lifecycle.generation.stop(state),
          },
        },
      }).then((state) => {
        this.currentState = state;
        return state;
      });
    }
    return this.runPromise;
  }
}

class GenerationsResource {
  constructor(private readonly options: ChatOptions) {}

  create(input: CreateGenerationInput): Generation {
    return new GenerationResource(this.options, input);
  }
}

// Resource-oriented chat SDK facade. API, web, and mobile all configure this
// once and then work with addressable generation resources, instead of
// wiring up provider callbacks themselves each time.
export class ChatClient {
  readonly generations: GenerationsResource;

  constructor(options: ChatOptions) {
    this.generations = new GenerationsResource(options);
  }
}

export type { GenerationInput, GenerationState, GenerationToolCall, ToolResult };
