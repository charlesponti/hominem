import {
  loadJson,
  loadText,
  registerJsonSuite,
  renderMessages,
  type Golden,
  type PromptMessage,
} from './lib/evaluator';
import { jobImportSchema } from './lib/schemas';

const suiteDir = new URL('../data/career-job-import/', import.meta.url);
const prompt = await loadJson<PromptMessage[]>(new URL('prompt.json', suiteDir));
const cases = await loadJson<Golden[]>(new URL('goldens.json', suiteDir));
const postingText = await loadText(new URL('fixtures/whatnot-ashby-posting.html', suiteDir));

registerJsonSuite({
  name: 'career job import',
  cases,
  buildInput: () => renderMessages(prompt, { postingText }),
  outputSchema: jobImportSchema,
  rubric: [
    'Require the correct Whatnot company and AI Tooling Engineer role.',
    'Require fullText and jobDescription to retain the complete job description in source order, not a summary.',
    'Require fields to be grounded only in the supplied posting and leave unavailable fields empty.',
  ].join('\n'),
});
