import {
  loadJson,
  registerJsonSuite,
  renderMessages,
  type Golden,
  type PromptMessage,
} from './lib/evaluator';

const prompt = await loadJson<PromptMessage[]>(
  new URL('../data/chat-assistant/prompt.json', import.meta.url),
);
const cases = await loadJson<Golden[]>(
  new URL('../data/chat-assistant/goldens.json', import.meta.url),
);

registerJsonSuite({
  name: 'chat assistant',
  cases,
  buildInput: (golden) => renderMessages(prompt, { user_message: golden.input }),
  rubric: [
    'Use the expected output below as the authoritative reference for the answer’s conclusion and essential reasoning.',
    'The response should answer the user directly in one or two concise sentences, preserving the reference’s grounded, blunt tone.',
    'Treat material omissions, invented claims, generic advice, reassurance, hedging, or padding as failures even when the general topic is correct.',
  ].join('\n'),
  assertOutput: (output) => {
    const normalized = output.trim();
    if (!normalized) throw new Error('Chat assistant returned an empty response');
    if (normalized.length > 240) {
      throw new Error(`Chat assistant response is not concise (${normalized.length} characters)`);
    }
  },
});
