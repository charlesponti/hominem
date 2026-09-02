// @vitest-environment jsdom
import { render } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@shopify/flash-list', () => ({
  FlashList: ({
    ListFooterComponent,
    ListHeaderComponent,
  }: {
    ListFooterComponent?: React.ReactNode;
    ListHeaderComponent?: React.ReactNode;
  }) => (
    <div data-testid="flash-list">
      <div data-testid="list-header">{ListHeaderComponent}</div>
      <div data-testid="list-footer">{ListFooterComponent}</div>
    </div>
  ),
}));
vi.mock('react-native', () => ({
  AccessibilityInfo: { announceForAccessibility: vi.fn() },
  Pressable: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('~/components/theme', () => ({
  useStyles: (factory: (theme: { colors: Record<string, string> }) => unknown) =>
    factory({
      colors: {
        foreground: '',
        mutedForeground: '',
        muted: '',
        primary: '',
        tertiary: '',
      },
    }),
}));
vi.mock('~/components/chat/chat-message', () => ({ ChatMessage: () => <div /> }));
vi.mock('~/components/chat/chat-shimmer-message', () => ({
  ChatShimmerMessage: () => <div />,
}));

const { ChatMessageList } = await import('~/components/chat/chat-message-list');

describe('ChatMessageList', () => {
  it('does not own the generation activity card', () => {
    const { getByTestId, queryByTestId } = render(
      <ChatMessageList
        displayMessages={[
          {
            id: 'user-1',
            renderKey: 'user-1',
            role: 'user',
            message: 'Trigger failure',
            created_at: new Date().toISOString(),
            chat_id: 'chat-1',
            profile_id: '',
            reasoning: null,
            toolCalls: null,
            isStreaming: false,
          },
        ]}
        formatTimestamp={() => ''}
        generation={{
          id: 'generation-1',
          chatId: 'chat-1',
          stage: 'failed',
          lastDurableSequence: 3,
        }}
        isMessagesLoading={false}
        showDebug={false}
        showSearch={false}
        searchQuery=""
      />,
    );

    expect(getByTestId('list-footer').querySelector('[data-testid="chat-activity"]')).toBeNull();
    expect(getByTestId('list-header').querySelector('[data-testid="chat-activity"]')).toBeNull();
    expect(queryByTestId('chat-activity')).toBeNull();
  });
});
