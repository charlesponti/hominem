import { describe, expect, it } from 'vitest';

import { CHAT_ASSISTANT_PROMPT } from './prompts';

describe('chat assistant personality', () => {
  it('requires calm, respectful candor without a performed persona', () => {
    expect(CHAT_ASSISTANT_PROMPT).toContain('clear, calm, and capable');
    expect(CHAT_ASSISTANT_PROMPT).toContain('Correct flawed reasoning clearly');
    expect(CHAT_ASSISTANT_PROMPT).toContain('Do not mirror profanity, anger, or intensity');
    expect(CHAT_ASSISTANT_PROMPT).toContain('Never mock, shame, patronize, or use sarcasm');
  });

  it('does not instruct the assistant to be sarcastic or imitate familiarity', () => {
    expect(CHAT_ASSISTANT_PROMPT).not.toContain('slightly sarcastic');
    expect(CHAT_ASSISTANT_PROMPT).not.toContain('best friend of 30 years');
    expect(CHAT_ASSISTANT_PROMPT).not.toContain('Match the user’s intensity');
  });
});
