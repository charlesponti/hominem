import { expect, test } from 'bun:test';

import { pilotCases, setupAgent, setupJudge } from 'ori/eval';

import { loadJson, judgeModel, targetModel, type Golden } from './lib/evaluator';
import mcpHarness from './lib/mcp-harness';

type McpGolden = Golden & { expectedTools: Array<{ name: string }> };
const cases = await loadJson<McpGolden[]>(
  new URL('../data/mcp-tool-selection/goldens.json', import.meta.url),
);
const sampledCases = pilotCases(cases);
const agent = setupAgent({ model: targetModel, harness: mcpHarness });
const judge = setupJudge({ agent: setupAgent({ model: judgeModel }), minScore: 0.7 });

test('MCP tool selection', async () => {
  const failures: Error[] = [];
  const batches = Array.from({ length: Math.ceil(sampledCases.length / 3) }, (_, index) =>
    sampledCases.slice(index * 3, index * 3 + 3),
  );

  for (const batch of batches) {
    const settled = await Promise.allSettled(
      batch.map(async (golden) => {
        const run = await agent.run({
          prompt: golden.input,
          systemPrompt:
            'Use the available Hominem tools when they are needed. Complete the request concisely.',
        });
        const expectedTools = golden.expectedTools.map((tool) => tool.name);
        for (const tool of expectedTools) run.tool(tool).toBeCalled();
        expect(run.toolCalls).toEqual(expectedTools);
        run.toComplete();
        await judge.autoEvals({
          criteria: [
            'Complete the request using the minimum necessary tool calls.',
            'Call exactly the expected tools, in the expected order, and do not call unrelated tools.',
            'Return a concise answer grounded in the tool results.',
            `Expected tools: ${expectedTools.join(', ')}`,
            `Expected answer: ${golden.expectedOutput}`,
          ].join('\n'),
          prompt: golden.input,
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
