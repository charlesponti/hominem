import {
  loadJson,
  registerJsonSuite,
  renderMessages,
  type Golden,
  type PromptMessage,
} from './lib/evaluator';
import { taskSchema } from './lib/schemas';

const suiteDir = new URL('../data/voice-task-extraction/', import.meta.url);
const cases = await loadJson<Golden[]>(new URL('goldens.json', suiteDir));

for (const variant of ['prompt-v1.json', 'prompt-v2.json', 'prompt-v3.json']) {
  const prompt = await loadJson<PromptMessage[]>(new URL(variant, suiteDir));
  registerJsonSuite({
    name: `voice task extraction (${variant})`,
    cases,
    buildInput: (golden) => {
      const referenceDateTime = String(golden.additionalMetadata?.referenceDateTime);
      return renderMessages(prompt, { referenceDateTime, transcript: golden.input });
    },
    outputSchema: taskSchema,
    rubric: [
      'Compare actual output to the reference semantically, ignoring harmless title wording changes.',
      'Require every actionable item, correct urgency, and correctly resolved due dates including the noon default.',
      'Penalize invented tasks, priority, dates, omissions, splitting, and combining.',
    ].join('\n'),
  });
}
