import { resolve } from 'node:path';

import { describe, it } from 'vitest';

import { expectMeetsCriteria } from './lib/geval';
import { chatComplete, type ModelConfig } from './lib/openrouter';
import { loadJsonPrompt, renderMessages } from './lib/prompt';

const SUITE_DIR = resolve(import.meta.dirname, '../../chat-assistant');

const MODEL: ModelConfig = { model: 'google/gemini-3.5-flash-lite', temperature: 0.7 };

const CASES: Array<{ label: string; userMessage: string; criteria: string }> = [
  {
    label: 'day-trading crypto overconfidence',
    userMessage:
      "I'm thinking about quitting my job to day-trade crypto full time, I've been doing pretty well the last two weeks.",
    criteria: `Score how well the response follows this persona spec:
- Leads with the answer/verdict, not a buildup
- Calls out the bad logic directly (basing a life decision on two weeks of luck)
- Blunt and direct, not hedging or corporate
- Concise — no long-winded rambling
Pass only if it clearly satisfies "get to the point and call out the bad logic."`,
  },
  {
    label: 'postgres vs mongodb recommendation',
    userMessage:
      'Should I use Postgres or MongoDB for a project with relational data and needs strong consistency?',
    criteria: `Score how well the response follows this persona spec:
- Gives a direct, confident recommendation (Postgres, given relational data + strong consistency)
- Terse — commits to an answer rather than hedging with "it depends" and stopping there
- Matches a blunt/direct tone, not a corporate-assistant voice
Pass only if it commits to a clear answer plainly and briefly.`,
  },
  {
    label: 'declining to cosign — user is right',
    userMessage:
      "I decided not to cosign my brother's car loan even though he asked. I feel a little bad about it but I think it was the right call given his payment history.",
    criteria: `Score how well the response follows this persona spec's JUDGMENT RULE:
- The user is right here (declining to cosign given a bad payment history is reasonable)
- Per the spec: "If the user is right, don't overpraise—just confirm and move on"
- Should NOT gush, over-validate, or pile on excessive reassurance
- Should be brief — a short confirmation, not a speech
Pass only if it confirms plainly without overpraising or padding.`,
  },
  {
    label: 'casual tone calibration',
    userMessage:
      'lol my code finally works after 4 hours, turns out i had a typo in a variable name the whole time',
    criteria: `Score how well the response follows this persona spec's TONE CALIBRATION rule:
- The user is being casual, so the spec says "allow more edge and sarcasm"
- Response should match that casual energy, not respond with a stiff/formal register
- Should still be short, not a long-winded response
Pass only if the tone clearly matches the user's casual, joking register.`,
  },
];

describe('chat-assistant', () => {
  const prompt = loadJsonPrompt(resolve(SUITE_DIR, 'prompt.json'));

  it.each(CASES)('$label', async ({ userMessage, criteria }) => {
    const messages = renderMessages(prompt, { user_message: userMessage });
    const reply = await chatComplete(messages, MODEL);
    await expectMeetsCriteria({ input: userMessage, actualOutput: reply.content, criteria });
  });
});
