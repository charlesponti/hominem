import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it } from 'vitest';

import checkJobImport from '../career-job-import/assertions';
import { chatComplete, type ModelConfig } from './lib/openrouter';
import { loadJsonPrompt, renderMessages } from './lib/prompt';

const SUITE_DIR = resolve(import.meta.dirname, '../../career-job-import');

const MODEL: ModelConfig = { model: 'google/gemini-3.5-flash-lite', temperature: 0 };

describe('career-job-import', () => {
  it('extracts the Whatnot AI Tooling Engineer posting', async () => {
    const prompt = loadJsonPrompt(resolve(SUITE_DIR, 'prompt.json'));
    const postingText = readFileSync(
      resolve(SUITE_DIR, 'fixtures/whatnot-ashby-posting.html'),
      'utf8',
    );
    const messages = renderMessages(prompt, { postingText });

    const reply = await chatComplete(messages, MODEL);
    checkJobImport(reply.content);
  });
});
