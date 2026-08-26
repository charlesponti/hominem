import { resolve } from 'node:path';

import 'deepeval/vitest';
import { EvaluationDataset, Golden } from 'deepeval/dataset';
import { GEval, JsonCorrectnessMetric } from 'deepeval/metrics';
import { SingleTurnParams } from 'deepeval/test-case';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import goldens from '../../datasets/task-extraction/goldens.json';
import { judgeModel } from '../lib/judge';
import { loadJsonPrompt, renderMessages } from '../lib/prompt';
import { runTarget } from '../lib/target';

const prompt = loadJsonPrompt(
  resolve(import.meta.dirname, '../../datasets/task-extraction/prompt-v3.json'),
);
const dataset = new EvaluationDataset({ goldens: goldens.map((golden) => new Golden(golden)) });
const metrics = [
  new JsonCorrectnessMetric({
    expectedSchema: z.object({
      tasks: z.array(z.object({ title: z.string(), description: z.string().optional() }).strict()),
    }),
    threshold: 1,
    includeReason: false,
    model: judgeModel,
  }),
  new GEval({
    name: 'Task extraction correctness',
    evaluationSteps: [
      'Compare actual output to expected output semantically, ignoring harmless title wording changes.',
      'Require every actionable commitment and forbid vague thoughts or invented tasks.',
      'Penalize missing, combined, split, or materially incorrect tasks.',
    ],
    evaluationParams: [
      SingleTurnParams.INPUT,
      SingleTurnParams.ACTUAL_OUTPUT,
      SingleTurnParams.EXPECTED_OUTPUT,
    ],
    model: judgeModel,
    threshold: 0.7,
  }),
];

describe('task extraction', () => {
  for (const golden of dataset.goldens) {
    if (!(golden instanceof Golden)) throw new Error('Task extraction dataset must be single-turn');
    it(golden.name ?? golden.input, async () => {
      await expect(golden).toPass(metrics, {
        task: (testCase) => runTarget(renderMessages(prompt, { conversation: testCase.input })),
      });
    });
  }
});
