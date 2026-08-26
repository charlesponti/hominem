import { expect, test } from 'bun:test';

import { pilotCases, setupAgent, setupJudge } from 'ori/eval';

import chatHarness from './chat-harness';

export type Golden = {
  name?: string;
  input: string;
  expectedOutput: string;
  additionalMetadata?: Record<string, unknown>;
};

export type PromptMessage = { role: string; content: string };

export const targetModel = process.env.ORI_TARGET_MODEL?.trim() || 'openai/gpt-4o-mini';
export const judgeModel = process.env.ORI_JUDGE_MODEL?.trim() || 'openai/gpt-oss-20b';

export const loadJson = async <T>(url: URL): Promise<T> => (await Bun.file(url).json()) as T;

export const loadText = (url: URL): Promise<string> => Bun.file(url).text();

export const render = (template: string, values: Record<string, string>): string =>
  template.replace(/{{\s*([^}]+?)\s*}}/g, (_, key: string) => values[key.trim()] ?? '');

export const renderMessages = (
  messages: PromptMessage[],
  values: Record<string, string>,
): { prompt: string; systemPrompt: string } => {
  const rendered = messages.map((message) => ({
    ...message,
    content: render(message.content, values),
  }));
  const systemPrompt = rendered.find((message) => message.role === 'system')?.content ?? '';
  const prompt = rendered
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n\n');
  return { prompt, systemPrompt };
};

type SuiteOptions = {
  name: string;
  cases: Golden[];
  buildInput: (golden: Golden) => { prompt: string; systemPrompt: string };
  rubric: string;
  outputSchema?: unknown;
  plainChat?: boolean;
  assertOutput?: (output: string, golden: Golden) => void;
};

export const registerJsonSuite = ({
  name,
  cases,
  buildInput,
  rubric,
  outputSchema,
  plainChat = false,
  assertOutput,
}: SuiteOptions): void => {
  const setupSuiteAgent = (model: string) =>
    plainChat ? setupAgent({ model, harness: chatHarness }) : setupAgent({ model });
  const agent = setupSuiteAgent(targetModel);
  const judge = setupJudge({
    agent: setupSuiteAgent(judgeModel),
    minScore: 0.7,
  });
  const sampledCases = pilotCases(cases);

  test(name, async () => {
    const failures: Error[] = [];
    const batches = Array.from({ length: Math.ceil(sampledCases.length / 3) }, (_, index) =>
      sampledCases.slice(index * 3, index * 3 + 3),
    );

    for (const batch of batches) {
      const settled = await Promise.allSettled(
        batch.map(async (golden) => {
          const input = buildInput(golden);
          const run = await agent.run({
            ...input,
            ...(outputSchema ? { outputSchema: { name, schema: outputSchema } } : {}),
          });
          assertOutput?.(run.text, golden);
          run.toComplete();
          run.toFinishWithin(120_000);
          await judge.autoEvals({
            criteria: `${rubric}\n\nReference output:\n${golden.expectedOutput}`,
            prompt: input.prompt,
            run,
          });
        }),
      );

      for (const result of settled) {
        if (result.status === 'rejected') {
          failures.push(
            result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });
};
