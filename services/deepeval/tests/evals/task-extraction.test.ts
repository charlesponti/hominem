import { resolve } from 'node:path';

import { describe, it } from 'vitest';

import checkTasks from '../../task-extraction/assertions';
import { chatComplete, type ModelConfig } from './lib/openrouter';
import { loadJsonPrompt, renderMessages } from './lib/prompt';

const SUITE_DIR = resolve(import.meta.dirname, '../../task-extraction');

const MODEL: ModelConfig = { model: 'google/gemini-3.5-flash-lite', temperature: 0 };

const CASES: Array<{ caseId: string; conversation: string }> = [
  {
    caseId: 'multi-task',
    conversation:
      "User: I need to email the landlord about renewing the lease, and also I should probably call the dentist to reschedule my cleaning. Oh and I was thinking about maybe repainting the living room at some point.\nAssistant: Got it, anything else?\nUser: No that's it for now.",
  },
  {
    caseId: 'no-tasks',
    conversation:
      "User: I've been thinking a lot about whether remote work is actually better for productivity.\nAssistant: That's an interesting question, what's prompting it?\nUser: Just reflecting on the last year I guess.",
  },
  {
    caseId: 'single-task',
    conversation:
      "User: I really need to renew my driver's license before it expires next month.\nAssistant: Got it.",
  },
  {
    caseId: 'many-tasks',
    conversation:
      "User: Okay let's plan the week. I need to book flights for the conference, submit the expense report from last trip, follow up with the vendor about the contract, and schedule a 1:1 with Sarah.\nAssistant: Anything else?\nUser: Nope that covers it.",
  },
  {
    caseId: 'implicit-actionable',
    conversation:
      "User: I just realized my passport expired last month and we're supposed to fly internationally in six weeks.\nAssistant: Oh no, that's cutting it close.\nUser: Yeah tell me about it.",
  },
];

describe('task-extraction', () => {
  const prompt = loadJsonPrompt(resolve(SUITE_DIR, 'prompt-v3.json'));

  it.each(CASES)('$caseId', async ({ caseId, conversation }) => {
    const messages = renderMessages(prompt, { conversation });
    const reply = await chatComplete(messages, MODEL);
    checkTasks(reply.content, caseId);
  });
});
