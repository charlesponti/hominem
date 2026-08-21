import { resolve } from 'node:path';

import { describe, it } from 'vitest';

import checkVoiceTasks from '../voice-task-extraction/assertions';
import { chatComplete, type ModelConfig } from './lib/openrouter';
import { loadJsonPrompt, renderMessages } from './lib/prompt';

const SUITE_DIR = resolve(import.meta.dirname, '../../voice-task-extraction');

const MODEL: ModelConfig = { model: 'google/gemini-3.5-flash-lite', temperature: 0 };

// Three prompt candidates under comparison — v1 is the current production
// prompt, v2/v3 are revisions. Keep testing all three side by side until one
// is promoted and the others retired.
const PROMPT_VARIANTS = [
  { label: 'v1-production', file: 'prompt-v1.json' },
  { label: 'v2-candidate', file: 'prompt-v2.json' },
  { label: 'v3-candidate', file: 'prompt-v3.json' },
];

const CASES: Array<{ caseId: string; referenceDateTime: string; transcript: string }> = [
  {
    caseId: 'urgency-and-date',
    referenceDateTime: '2026-07-06T09:00:00-07:00 (America/Los_Angeles)',
    transcript:
      'um so I need to urgently email the landlord about the lease renewal like today, and uh also remind me to call the dentist next Friday no rush on that one',
  },
  {
    caseId: 'noon-default',
    referenceDateTime: '2026-07-06T09:00:00-07:00 (America/Los_Angeles)',
    transcript: 'I need to submit the tax documents by next Friday',
  },
  {
    caseId: 'in-two-weeks',
    referenceDateTime: '2026-07-06T09:00:00-07:00 (America/Los_Angeles)',
    transcript: 'remind me to renew the car registration in two weeks',
  },
  {
    caseId: 'explicit-clock-time',
    referenceDateTime: '2026-07-06T09:00:00-07:00 (America/Los_Angeles)',
    transcript: 'I have to pick up my kid from school tomorrow at 3pm',
  },
  {
    caseId: 'multi-mixed-urgency',
    referenceDateTime: '2026-07-06T09:00:00-07:00 (America/Los_Angeles)',
    transcript:
      'okay so the production server is down and someone needs to restart it ASAP, also I want to read that book on stoicism whenever I get a chance no particular rush, and uh I need to buy groceries this week',
  },
  {
    caseId: 'no-actionable-items',
    referenceDateTime: '2026-07-06T09:00:00-07:00 (America/Los_Angeles)',
    transcript:
      'um so like I was just thinking about how weird it is that time feels faster now than when I was a kid',
  },
];

describe('voice-task-extraction', () => {
  for (const variant of PROMPT_VARIANTS) {
    describe(variant.label, () => {
      const prompt = loadJsonPrompt(resolve(SUITE_DIR, variant.file));

      it.each(CASES)('$caseId', async ({ caseId, referenceDateTime, transcript }) => {
        const messages = renderMessages(prompt, { referenceDateTime, transcript });
        const reply = await chatComplete(messages, MODEL);
        checkVoiceTasks(reply.content, caseId);
      });
    });
  }
});
