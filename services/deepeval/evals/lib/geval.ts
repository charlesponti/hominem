import { GEval } from 'deepeval/metrics';
import { LLMTestCase, SingleTurnParams } from 'deepeval/test-case';
import { expect } from 'vitest';

import { judgeModel } from './judge';

export async function expectMeetsCriteria(params: {
  input: string;
  actualOutput: string;
  criteria: string;
  name?: string;
  threshold?: number;
}): Promise<void> {
  const { input, actualOutput, criteria, name = 'Eval criteria', threshold = 0.7 } = params;
  const metric = new GEval({
    name,
    criteria,
    evaluationParams: [SingleTurnParams.INPUT, SingleTurnParams.ACTUAL_OUTPUT],
    model: judgeModel,
    threshold,
  });
  const score = await metric.measure(new LLMTestCase({ input, actualOutput }));
  expect(
    score,
    `GEval score ${score} is below threshold ${threshold} for criteria:\n${criteria}\n\nActual output:\n${actualOutput}`,
  ).toBeGreaterThanOrEqual(threshold);
}
