import { resolve } from 'node:path';

import { describe, it } from 'vitest';

import checkTimeBlock from '../../time-block-extraction/assertions';
import { HOLDOUT_CASES } from '../../time-block-extraction/cases';
import { chatComplete, type ModelConfig } from './lib/openrouter';
import { loadJsonPrompt, renderMessages } from './lib/prompt';

const SUITE_DIR = resolve(import.meta.dirname, '../../time-block-extraction');

const MODEL: ModelConfig = { model: 'google/gemini-3.5-flash-lite', temperature: 0, maxTokens: 768 };

describe('time-block-holdout', () => {
  const prompt = loadJsonPrompt(resolve(SUITE_DIR, 'prompt.json'));

  it.each(HOLDOUT_CASES)('$caseId', async (testCase) => {
    const messages = renderMessages(prompt, {
      referenceDateTime: testCase.referenceDateTime,
      timezone: testCase.timezone,
      calendarContext: testCase.calendarContext,
      conversationContext: testCase.conversationContext,
      input: testCase.input,
    });
    const reply = await chatComplete(messages, MODEL);
    checkTimeBlock(reply.content, testCase);
  });
});
