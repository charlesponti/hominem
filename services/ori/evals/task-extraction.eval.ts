import {
  loadJson,
  registerJsonSuite,
  renderMessages,
  type Golden,
  type PromptMessage,
} from './lib/evaluator';
import { taskSchema } from './lib/schemas';

const prompt = await loadJson<PromptMessage[]>(
  new URL('../data/task-extraction/prompt-v3.json', import.meta.url),
);
const cases = await loadJson<Golden[]>(
  new URL('../data/task-extraction/goldens.json', import.meta.url),
);

registerJsonSuite({
  name: 'task extraction',
  cases,
  buildInput: (golden) => renderMessages(prompt, { conversation: golden.input }),
  outputSchema: taskSchema,
  rubric: [
    'Compare the JSON output to the reference output semantically, ignoring harmless title wording changes.',
    'Require every actionable commitment and forbid vague thoughts or invented tasks.',
    'Penalize missing, combined, split, or materially incorrect tasks.',
  ].join('\n'),
});
