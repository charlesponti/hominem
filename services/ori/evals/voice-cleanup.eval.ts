import {
  loadJson,
  registerJsonSuite,
  renderMessages,
  type Golden,
  type PromptMessage,
} from './lib/evaluator';
import { voiceCleanupSchema } from './lib/schemas';

const prompt = await loadJson<PromptMessage[]>(
  new URL('../data/voice-cleanup/prompt.json', import.meta.url),
);
const cases = await loadJson<Golden[]>(
  new URL('../data/voice-cleanup/goldens.json', import.meta.url),
);

registerJsonSuite({
  name: 'voice cleanup',
  cases,
  buildInput: (golden) => renderMessages(prompt, { rawText: golden.input }),
  outputSchema: voiceCleanupSchema,
  rubric: [
    'Compare actual output to the reference while allowing harmless punctuation and capitalization differences.',
    'Require names, numbers, dates, meaning, and intent to remain intact.',
    'Require filler and repeated speech fragments to be removed without summarizing or inventing content.',
  ].join('\n'),
});
