// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => mockNavigate,
}));

const mockArchiveMutate = vi.fn();
const mockCreateChatMutate = vi.fn();
const archiveState = { isPending: false };
const createChatState = { isPending: false };

vi.mock('~/hooks/use-chats', () => ({
  useArchiveChat: () => ({ mutate: mockArchiveMutate, isPending: archiveState.isPending }),
  useCreateChat: () => ({ mutate: mockCreateChatMutate, isPending: createChatState.isPending }),
}));

import { ChatConversationActions } from './chat-conversation-actions';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  archiveState.isPending = false;
  createChatState.isPending = false;
});

describe('ChatConversationActions', () => {
  it('delegates active actions and disables only the affected controls', async () => {
    const onSearch = vi.fn();
    archiveState.isPending = true;
    render(
      <ChatConversationActions
        chatId="chat-1"
        onResponseSettings={() => undefined}
        onSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Search messages' }));
    expect(onSearch).toHaveBeenCalledOnce();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open conversation actions' }), {
      button: 0,
    });
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'New chat' })).toBeTruthy());
    fireEvent.click(screen.getByRole('menuitem', { name: 'New chat' }));
    expect(mockCreateChatMutate).toHaveBeenCalledOnce();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open conversation actions' }), {
      button: 0,
    });
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Archiving conversation…' })).toBeTruthy(),
    );
    expect(
      screen
        .getByRole('menuitem', { name: 'Archiving conversation…' })
        .hasAttribute('data-disabled'),
    ).toBe(true);
    expect(screen.getByRole('menuitem', { name: 'Response settings' })).toBeTruthy();
  });

  it('keeps unrelated actions available while search or settings owns the pending state', async () => {
    const onResponseSettings = vi.fn();
    const onSearch = vi.fn();
    const { rerender } = render(
      <ChatConversationActions
        chatId="chat-1"
        isSearchOpen
        onResponseSettings={onResponseSettings}
        onSearch={onSearch}
      />,
    );

    expect(screen.getByRole('button', { name: 'Search messages' }).hasAttribute('disabled')).toBe(
      true,
    );

    rerender(
      <ChatConversationActions
        chatId="chat-1"
        isSettingsOpen
        onResponseSettings={onResponseSettings}
        onSearch={onSearch}
      />,
    );

    expect(screen.getByRole('button', { name: 'Search messages' }).hasAttribute('disabled')).toBe(
      false,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search messages' }));
    expect(onSearch).toHaveBeenCalledOnce();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open conversation actions' }), {
      button: 0,
    });
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Response settings' })).toBeTruthy(),
    );
    expect(
      screen.getByRole('menuitem', { name: 'Response settings' }).hasAttribute('data-disabled'),
    ).toBe(true);
    expect(screen.getByRole('menuitem', { name: 'Archive conversation' })).toBeTruthy();
  });

  it('exposes an accessible scoped debug toggle', async () => {
    const onDebug = vi.fn();
    const { rerender } = render(
      <ChatConversationActions
        chatId="chat-1"
        onDebug={onDebug}
        onResponseSettings={() => undefined}
        onSearch={() => undefined}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open conversation actions' }), {
      button: 0,
    });
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Enable debug mode' })).toBeTruthy(),
    );
    const toggle = screen.getByRole('menuitem', { name: 'Enable debug mode' });
    fireEvent.click(toggle);
    expect(onDebug).toHaveBeenCalledOnce();

    rerender(
      <ChatConversationActions
        chatId="chat-1"
        isDebugOpen
        onDebug={onDebug}
        onResponseSettings={() => undefined}
        onSearch={() => undefined}
      />,
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open conversation actions' }), {
      button: 0,
    });
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Disable debug mode' })).toBeTruthy(),
    );
  });

  it('archives and starts a new chat through the scoped hooks', async () => {
    render(
      <ChatConversationActions
        chatId="chat-42"
        onResponseSettings={() => undefined}
        onSearch={() => undefined}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open conversation actions' }), {
      button: 0,
    });
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Archive conversation' })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive conversation' }));
    expect(mockArchiveMutate).toHaveBeenCalledWith({ chatId: 'chat-42' });
  });
});
