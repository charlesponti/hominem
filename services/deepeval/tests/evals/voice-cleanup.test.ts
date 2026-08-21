import { resolve } from 'node:path';

import { describe, it } from 'vitest';

import checkCleanup from '../../voice-cleanup/assertions';
import { chatComplete, type ModelConfig } from './lib/openrouter';
import { loadJsonPrompt, renderMessages } from './lib/prompt';

const SUITE_DIR = resolve(import.meta.dirname, '../../voice-cleanup');

const MODEL: ModelConfig = { model: 'google/gemini-3.5-flash-lite', temperature: 0 };

const CASES: Array<{ label: string; rawText: string; mustPreserve: string[] }> = [
  {
    label: 'dry cleaning + call reminder',
    rawText:
      "um so like i need to uh pick up the the dry cleaning tomorrow and also um call john about the uh about the meeting on thursday i think it's at like 3pm or something",
    mustPreserve: ['dry cleaning', 'john', 'thursday', '3'],
  },
  {
    label: 'repeated words, bank call',
    rawText: 'i i need to call call the the bank about about my account tomorrow',
    mustPreserve: ['bank', 'account', 'tomorrow'],
  },
  {
    label: 'invoice reminder with ordinal date',
    rawText: "remind sarah that the invoice number is uh four five two one and it's due on the fifteenth",
    mustPreserve: ['sarah', '4521', 'fifteenth'],
  },
  {
    // No filler at all — the prompt says "if uncertain, return the original
    // transcript unchanged" and "do not summarize, expand, or paraphrase". A
    // clean transcript should come back essentially as-is, not rewritten.
    label: 'already-clean transcript',
    rawText: 'Pick up milk and eggs on the way home.',
    mustPreserve: ['milk', 'eggs', 'way home'],
  },
];

describe('voice-cleanup', () => {
  const prompt = loadJsonPrompt(resolve(SUITE_DIR, 'prompt.json'));

  it.each(CASES)('$label', async ({ rawText, mustPreserve }) => {
    const messages = renderMessages(prompt, { rawText });
    const reply = await chatComplete(messages, MODEL);
    checkCleanup(reply.content, mustPreserve);
  });
});
