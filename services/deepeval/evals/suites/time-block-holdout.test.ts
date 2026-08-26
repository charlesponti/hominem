import { resolve } from 'node:path';

import 'deepeval/vitest';
import { EvaluationDataset, Golden } from 'deepeval/dataset';
import { GEval, JsonCorrectnessMetric } from 'deepeval/metrics';
import { SingleTurnParams } from 'deepeval/test-case';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import goldens from '../../datasets/time-block-extraction/holdout.goldens.json';
import { judgeModel } from '../lib/judge';
import { loadJsonPrompt, renderMessages } from '../lib/prompt';
import { runTarget } from '../lib/target';

const prompt = loadJsonPrompt(
  resolve(import.meta.dirname, '../../datasets/time-block-extraction/prompt.json'),
);
const dataset = new EvaluationDataset({ goldens: goldens.map((golden) => new Golden(golden)) });
const outputSchema = z
  .object({
    primary_intent: z.enum([
      'add_task',
      'add_event',
      'add_recurring_event',
      'edit_event',
      'cancel_event',
      'search',
      'schedule_gap_fill',
    ]),
    title: z.string().nullable(),
    target_title: z.string().nullable(),
    participants: z.array(z.string()).nullable(),
    location: z.string().nullable(),
    duration: z.number().int().nullable(),
    start_time: z.string().datetime({ offset: true }).nullable(),
    end_time: z.string().datetime({ offset: true }).nullable(),
    scheduling_window_start: z.string().datetime({ offset: true }).nullable(),
    scheduling_window_end: z.string().datetime({ offset: true }).nullable(),
    deadline_fixed: z.string().date().nullable(),
    recurrence_rule: z.string().nullable(),
  })
  .strict();
const metrics = [
  new JsonCorrectnessMetric({
    expectedSchema: outputSchema,
    threshold: 1,
    includeReason: false,
    model: judgeModel,
  }),
  new GEval({
    name: 'Time block holdout correctness',
    evaluationSteps: [
      'Compare actual output to expected output using input and context; ignore harmless title wording differences.',
      'Require correct intent, temporal grounding, duration, participants, deadline, recurrence, and target event.',
      'Require null for fields not established by the request and penalize inventions or superseded correction values.',
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

describe('time block holdout', () => {
  for (const golden of dataset.goldens) {
    if (!(golden instanceof Golden)) throw new Error('Time block dataset must be single-turn');
    it(golden.name ?? golden.input, async () => {
      const metadata = golden.additionalMetadata ?? {};
      await expect(golden).toPass(metrics, {
        task: (testCase) =>
          runTarget(
            renderMessages(prompt, {
              referenceDateTime: String(metadata.referenceDateTime),
              timezone: String(metadata.timezone),
              calendarContext: String(metadata.calendarContext),
              conversationContext: String(metadata.conversationContext),
              input: testCase.input,
            }),
          ),
      });
    });
  }
});
