import { resolve } from 'node:path';

import { describe, it } from 'vitest';

import checkOffer from '../../offer-extraction/assertions';
import { CASES } from '../../offer-extraction/cases';
import { chatComplete, type ModelConfig } from './lib/openrouter';
import { loadTextPrompt, render } from './lib/prompt';

const SUITE_DIR = resolve(import.meta.dirname, '../../offer-extraction');

const MODEL: ModelConfig = {
  model: 'google/gemini-3.5-flash-lite',
  temperature: 0.1,
  maxTokens: 1024,
  extraBody: { format: 'json' },
};

describe('offer-extraction', () => {
  const promptTemplate = loadTextPrompt(resolve(SUITE_DIR, 'prompt.md'));

  it.each(CASES)('$caseId', async (testCase) => {
    const input = render(promptTemplate, { notes: testCase.notes });
    const reply = await chatComplete([{ role: 'user', content: input }], MODEL);
    checkOffer(reply.content, testCase);
  });
});
