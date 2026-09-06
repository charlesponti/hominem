// @vitest-environment jsdom

import type { ChatMessageItem } from '@hominem/chat/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// use-stick-to-bottom observes size changes via ResizeObserver, which jsdom
// doesn't implement.
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  messagesToMarkdown,
} from './conversation';

afterEach(cleanup);

function message(overrides: Partial<ChatMessageItem> = {}): ChatMessageItem {
  return {
    id: 'm1',
    role: 'assistant',
    message: 'Hello there',
    createdAt: '2026-08-24T17:30:00.000Z',
    chatId: 'chat-1',
    toolCalls: null,
    ...overrides,
  };
}

describe('Conversation', () => {
  it('renders its children', () => {
    render(
      <Conversation>
        <ConversationContent>
          <div>a message</div>
        </ConversationContent>
      </Conversation>,
    );

    expect(screen.getByText('a message')).toBeTruthy();
  });
});

describe('ConversationEmptyState', () => {
  it('shows a default title and description', () => {
    render(<ConversationEmptyState />);

    expect(screen.getByText('No messages yet')).toBeTruthy();
    expect(screen.getByText('Start a conversation to see messages here')).toBeTruthy();
  });

  it('shows a custom title and description', () => {
    render(<ConversationEmptyState description="Ask away." title="Nothing here" />);

    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Ask away.')).toBeTruthy();
  });

  it('renders custom children instead of the default copy', () => {
    render(
      <ConversationEmptyState>
        <span>totally custom</span>
      </ConversationEmptyState>,
    );

    expect(screen.getByText('totally custom')).toBeTruthy();
    expect(screen.queryByText('No messages yet')).toBeNull();
  });
});

describe('messagesToMarkdown', () => {
  it('formats each message with a capitalized role label', () => {
    const markdown = messagesToMarkdown([
      message({ role: 'user', message: 'Hi' }),
      message({ role: 'assistant', message: 'Hello!' }),
    ]);

    expect(markdown).toBe('**User:** Hi\n\n**Assistant:** Hello!');
  });

  it('supports a custom formatter', () => {
    const markdown = messagesToMarkdown([message({ message: 'Hi' })], (m) => `> ${m.message}`);
    expect(markdown).toBe('> Hi');
  });
});

describe('ConversationDownload', () => {
  it('downloads the conversation as a markdown file', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ConversationDownload messages={[message({ message: 'Hi' })]} />);
    fireEvent.click(screen.getByRole('button'));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    clickSpy.mockRestore();
  });
});
