import { resolve } from 'node:path';

import 'deepeval/vitest';
import { EvaluationDataset, Golden } from 'deepeval/dataset';
import { GEval, JsonCorrectnessMetric } from 'deepeval/metrics';
import { SingleTurnParams } from 'deepeval/test-case';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import goldens from '../../datasets/voice-task-extraction/goldens.json';
import { judgeModel } from '../lib/judge';
import { loadJsonPrompt, renderMessages } from '../lib/prompt';
import { runTarget } from '../lib/target';

const variants = ['prompt-v1.json', 'prompt-v2.json', 'prompt-v3.json'];
const dataset = new EvaluationDataset({ goldens: goldens.map((golden) => new Golden(golden)) });
const metrics = [
  new JsonCorrectnessMetric({
    expectedSchema: z.object({
      tasks: z.array(
        z
          .object({
            title: z.string(),
            description: z.string().optional(),
            priority: z.enum(['low', 'medium', 'high']).optional(),
            dueAt: z.string().datetime({ offset: true }).optional(),
          })
          .strict(),
      ),
    }),
    threshold: 1,
    includeReason: false,
    model: judgeModel,
  }),
  new GEval({
    name: 'Voice task extraction correctness',
    evaluationSteps: [
      'Compare actual output to expected output semantically, ignoring harmless title wording changes.',
      'Require every actionable item, correct urgency, and correctly resolved due dates including the noon default.',
      'Penalize invented tasks, priority, dates, omissions, splitting, and combining.',
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

describe('voice task extraction', () => {
  for (const file of variants) {
    const prompt = loadJsonPrompt(
      resolve(import.meta.dirname, `../../datasets/voice-task-extraction/${file}`),
    );
    describe(file, () => {
      for (const golden of dataset.goldens) {
        if (!(golden instanceof Golden)) throw new Error('Voice task dataset must be single-turn');
        it(golden.name ?? golden.input, async () => {
          const referenceDateTime = String(golden.additionalMetadata?.referenceDateTime);
          await expect(golden).toPass(metrics, {
            task: (testCase) =>
              runTarget(renderMessages(prompt, { referenceDateTime, transcript: testCase.input })),
          });
        });
      }
    });
  }
});
