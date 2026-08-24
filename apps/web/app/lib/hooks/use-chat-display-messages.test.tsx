// @vitest-environment jsdom

import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useChatDisplayMessages } from './use-chat-display-messages';

function message(id: string): ChatMessageDto {
  return { id, chatId: 'chat-1', role: 'assistant', content: id } as ChatMessageDto;
}

describe('useChatDisplayMessages', () => {
  it('appends optimistic and pending messages without duplicating durable messages', async () => {
    const durable = [message('durable')];
    const { result } = renderHook(() => useChatDisplayMessages({ messages: durable }));

    act(() => {
      result.current.setOptimisticUserMessage(message('optimistic'));
      result.current.setPendingAssistantMessage(message('pending'));
    });

    await waitFor(() =>
      expect(result.current.displayMessages.map((item) => item.id)).toEqual([
        'durable',
        'optimistic',
        'pending',
      ]),
    );

    act(() => result.current.setPendingAssistantMessage(message('durable')));
    expect(result.current.displayMessages.map((item) => item.id)).toEqual([
      'durable',
      'optimistic',
    ]);
  });

  it('reports thinking only while an optimistic user message has no assistant response', async () => {
    const { result } = renderHook(() => useChatDisplayMessages({ messages: [] }));
    expect(result.current.isThinking).toBe(false);

    act(() => result.current.setOptimisticUserMessage(message('optimistic')));
    await waitFor(() => expect(result.current.isThinking).toBe(true));

    act(() => result.current.setPendingAssistantMessage(message('pending')));
    expect(result.current.isThinking).toBe(false);
  });
});
