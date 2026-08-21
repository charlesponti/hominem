import { describe, expect, it } from 'vitest';

import { CHAT_ASSISTANT_PROMPT, CHAT_TO_NOTE_PROMPT } from './prompts';

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

describe('chat-to-note transform prompt', () => {
  it('frames the input as a transcript to transform, not text to edit', () => {
    expect(CHAT_TO_NOTE_PROMPT).toContain('"User:" and "Assistant:" turns');
    expect(CHAT_TO_NOTE_PROMPT).toContain("Write one continuous document in the user's own voice");
  });

  it('forbids inventing facts and requires flagging unresolved threads', () => {
    expect(CHAT_TO_NOTE_PROMPT).toContain('Do not invent facts');
    expect(CHAT_TO_NOTE_PROMPT).toContain('say so plainly rather than resolving it yourself');
  });

  it('never emits a title, since the app sets it separately', () => {
    expect(CHAT_TO_NOTE_PROMPT).toContain('Do not add a title, heading, or front matter');
  });
});
