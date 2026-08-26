import { loadJson, loadText, registerJsonSuite, render, type Golden } from './lib/evaluator';
import { offerSchema } from './lib/schemas';

const suiteDir = new URL('../data/offer-extraction/', import.meta.url);
const prompt = await loadText(new URL('prompt.md', suiteDir));
const cases = await loadJson<Golden[]>(new URL('goldens.json', suiteDir));

registerJsonSuite({
  name: 'offer extraction',
  cases,
  buildInput: (golden) => ({
    prompt: render(prompt, { notes: golden.input }),
    systemPrompt: '',
  }),
  outputSchema: offerSchema,
  rubric: [
    'Compare actual output to the reference and source notes semantically, ignoring JSON field order.',
    'Require every stated compensation, currency, location, equity, bonus, visa, relocation, employment, and profile fact.',
    'Require responsible currency inference and explicit ambiguity only for direct contradiction.',
    'Penalize omissions, invented values, incorrect nulls, or merging multiple offers.',
  ].join('\n'),
});
