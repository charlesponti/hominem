// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatConversationActions } from './chat-conversation-actions';

afterEach(cleanup);

describe('ChatConversationActions', () => {
  it('delegates active actions and disables only the affected controls', () => {
    const onArchive = vi.fn();
    const onNewChat = vi.fn();
    const onSearch = vi.fn();
    render(
      <ChatConversationActions
        isArchiving
        onArchive={onArchive}
        onNewChat={onNewChat}
        onResponseSettings={() => undefined}
        onSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Search messages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start a new chat' }));
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onNewChat).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'Archiving conversation' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Response settings' }).hasAttribute('disabled')).toBe(
      false,
    );
    expect(screen.getByRole('toolbar', { name: 'Conversation actions' })).toBeTruthy();
  });

  it('keeps unrelated actions available while search or settings owns the pending state', () => {
    const onArchive = vi.fn();
    const onNewChat = vi.fn();
    const onResponseSettings = vi.fn();
    const onSearch = vi.fn();
    const { rerender } = render(
      <ChatConversationActions
        isSearchOpen
        onArchive={onArchive}
        onNewChat={onNewChat}
        onResponseSettings={onResponseSettings}
        onSearch={onSearch}
      />,
    );

    expect(screen.getByRole('button', { name: 'Search messages' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'Response settings' }).hasAttribute('disabled')).toBe(
      false,
    );
    expect(
      screen.getByRole('button', { name: 'Archive conversation' }).hasAttribute('disabled'),
    ).toBe(false);

    rerender(
      <ChatConversationActions
        isSettingsOpen
        onArchive={onArchive}
        onNewChat={onNewChat}
        onResponseSettings={onResponseSettings}
        onSearch={onSearch}
      />,
    );

    expect(screen.getByRole('button', { name: 'Response settings' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'Search messages' }).hasAttribute('disabled')).toBe(
      false,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search messages' }));
    expect(onSearch).toHaveBeenCalledOnce();
  });
});
