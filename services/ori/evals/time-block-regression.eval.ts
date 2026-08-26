import {
  loadJson,
  registerJsonSuite,
  renderMessages,
  type Golden,
  type PromptMessage,
} from './lib/evaluator';
import { timeBlockSchema } from './lib/schemas';

const suiteDir = new URL('../data/time-block-extraction/', import.meta.url);
const prompt = await loadJson<PromptMessage[]>(new URL('prompt.json', suiteDir));
const cases = await loadJson<Golden[]>(new URL('regression.goldens.json', suiteDir));

registerJsonSuite({
  name: 'time block regression',
  cases,
  buildInput: (golden) => {
    const metadata = golden.additionalMetadata ?? {};
    return renderMessages(prompt, {
      referenceDateTime: String(metadata.referenceDateTime),
      timezone: String(metadata.timezone),
      calendarContext: String(metadata.calendarContext),
      conversationContext: String(metadata.conversationContext),
      input: golden.input,
    });
  },
  outputSchema: timeBlockSchema,
  rubric: [
    'Compare actual output to the reference using the input and context; ignore harmless title wording differences.',
    'Require correct intent, temporal grounding, duration, participants, deadline, recurrence, and target event.',
    'Require null for fields not established by the request and penalize inventions or superseded correction values.',
  ].join('\n'),
});
