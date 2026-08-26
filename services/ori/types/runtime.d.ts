declare const process: {
  env: Record<string, string | undefined>;
};

declare const Bun: {
  file(url: URL): {
    json(): Promise<unknown>;
    text(): Promise<string>;
  };
};

declare module 'bun:test' {
  export function test(name: string, callback: () => unknown | Promise<unknown>): void;
  export function expect(value: unknown): {
    toEqual(expected: unknown): void;
    toContain(expected: unknown): void;
  };
}

declare module 'ori' {
  export enum AgentRuntimeEventTag {
    RunStarted = 'run.started',
    SessionStarted = 'session.started',
    SessionSucceeded = 'session.succeeded',
    SessionFailed = 'session.failed',
    TurnStarted = 'turn.started',
    TurnSucceeded = 'turn.succeeded',
    TurnFailed = 'turn.failed',
    AssistantTextDelta = 'assistant.text.delta',
    ToolStarted = 'tool.started',
    ToolSucceeded = 'tool.succeeded',
  }

  export type AgentRuntimeEvent = {
    type: AgentRuntimeEventTag;
    payload: Record<string, unknown>;
    model?: string | null;
    harness?: string;
  };

  export type HarnessInvokeOptions = {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    env?: Record<string, string | undefined>;
  };

  export type AgentHarness = unknown;

  export function defineHarness(options: {
    name: string;
    init(registrar: {
      registerPrompt(
        handler: (options: HarnessInvokeOptions) => AsyncGenerator<AgentRuntimeEvent>,
      ): void;
    }): void;
  }): AgentHarness;
}

declare module 'ori/eval' {
  type AgentRun = {
    text: string;
    toolCalls: string[];
    tool(name: string): { toBeCalled(): void };
    toComplete(): void;
    toFinishWithin(milliseconds: number): void;
  };

  type Agent = {
    run(options: Record<string, unknown>): Promise<AgentRun>;
  };

  type Judge = {
    autoEvals(options: { criteria: string; prompt: string; run: AgentRun }): Promise<void>;
  };

  export function pilotCases<T>(cases: T[]): T[];
  export function setupAgent(options: { model: string; harness?: unknown }): Agent;
  export function setupJudge(options: { agent: Agent; minScore: number }): Judge;
}
