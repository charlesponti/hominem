import { resolve } from 'node:path';

import 'deepeval/vitest';
import { EvaluationDataset, Golden } from 'deepeval/dataset';
import { GEval } from 'deepeval/metrics';
import { SingleTurnParams } from 'deepeval/test-case';
import { describe, expect, it } from 'vitest';

import goldens from '../../datasets/chat-assistant/goldens.json';
import { judgeModel } from '../lib/judge';
import { loadJsonPrompt, renderMessages } from '../lib/prompt';
import { runTarget } from '../lib/target';

const prompt = loadJsonPrompt(
  resolve(import.meta.dirname, '../../datasets/chat-assistant/prompt.json'),
);
const dataset = new EvaluationDataset({ goldens: goldens.map((golden) => new Golden(golden)) });
const metrics = [
  new GEval({
    name: 'Assistant persona and answer quality',
    evaluationSteps: [
      'Check that the response gives the correct substantive answer from expected output.',
      'Require a direct, concise, grounded, blunt tone appropriate to the user message.',
      'Reject corporate hedging, excessive reassurance, generic advice, needless padding, and invented claims.',
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

describe('chat assistant', () => {
  for (const golden of dataset.goldens) {
    if (!(golden instanceof Golden)) throw new Error('Chat assistant dataset must be single-turn');
    it(golden.name ?? golden.input, async () => {
      await expect(golden).toPass(metrics, {
        task: (testCase) => runTarget(renderMessages(prompt, { user_message: testCase.input })),
      });
    });
  }
});
