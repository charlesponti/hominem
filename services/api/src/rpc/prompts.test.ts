import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildChatSystemPrompt,
  CHAT_ASSISTANT_PROMPT,
  CHAT_RESPONSE_LENGTH_GUIDANCE,
  CHAT_TO_NOTE_PROMPT,
} from './prompts';

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

  it('makes default brevity explicit and appends each selected length mode', () => {
    expect(CHAT_ASSISTANT_PROMPT).toContain('answer in one or two sentences');
    expect(CHAT_ASSISTANT_PROMPT).toContain(
      'Do not add context, action plans, generic reassurance',
    );
    expect(buildChatSystemPrompt()).toBe(CHAT_ASSISTANT_PROMPT);

    for (const [length, guidance] of Object.entries(CHAT_RESPONSE_LENGTH_GUIDANCE)) {
      expect(buildChatSystemPrompt(length as keyof typeof CHAT_RESPONSE_LENGTH_GUIDANCE)).toBe(
        `${CHAT_ASSISTANT_PROMPT}\n\n${guidance}`,
      );
    }
  });

  it('keeps the DeepEval and Ori chat prompt snapshots aligned with production', () => {
    const files = [
      '../../../deepeval/datasets/chat-assistant/prompt.json',
      '../../../ori/data/chat-assistant/prompt.json',
    ];

    for (const file of files) {
      const messages = JSON.parse(
        readFileSync(resolve(import.meta.dirname, file), 'utf8'),
      ) as Array<{ role: string; content: string }>;
      expect(messages[0]).toEqual({ role: 'system', content: CHAT_ASSISTANT_PROMPT });
    }
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
