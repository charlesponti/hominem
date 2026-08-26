import { resolve } from 'node:path';

import 'deepeval/vitest';
import { EvaluationDataset, Golden } from 'deepeval/dataset';
import { GEval, JsonCorrectnessMetric } from 'deepeval/metrics';
import { SingleTurnParams } from 'deepeval/test-case';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import goldens from '../../datasets/voice-cleanup/goldens.json';
import { judgeModel } from '../lib/judge';
import { loadJsonPrompt, renderMessages } from '../lib/prompt';
import { runTarget } from '../lib/target';

const prompt = loadJsonPrompt(
  resolve(import.meta.dirname, '../../datasets/voice-cleanup/prompt.json'),
);
const dataset = new EvaluationDataset({ goldens: goldens.map((golden) => new Golden(golden)) });
const metrics = [
  new JsonCorrectnessMetric({
    expectedSchema: z.object({ cleanedText: z.string().min(1) }).strict(),
    threshold: 1,
    includeReason: false,
    model: judgeModel,
  }),
  new GEval({
    name: 'Transcript cleanup correctness',
    evaluationSteps: [
      'Compare actual output to expected output while allowing harmless punctuation and capitalization differences.',
      'Require the original meaning, names, numbers, dates, and intent to remain intact.',
      'Require filler and repeated speech fragments to be removed without summarizing or inventing content.',
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

describe('voice cleanup', () => {
  for (const golden of dataset.goldens) {
    if (!(golden instanceof Golden)) throw new Error('Voice cleanup dataset must be single-turn');
    it(golden.name ?? golden.input, async () => {
      await expect(golden).toPass(metrics, {
        task: (testCase) => runTarget(renderMessages(prompt, { rawText: testCase.input })),
      });
    });
  }
});
