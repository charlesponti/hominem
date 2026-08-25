// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatConversationActions } from './chat-conversation-actions';

afterEach(cleanup);

describe('ChatConversationActions', () => {
  it('delegates active actions and disables only the affected controls', async () => {
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
    expect(onSearch).toHaveBeenCalledOnce();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open conversation actions' }), {
      button: 0,
    });
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'New chat' })).toBeTruthy());
    fireEvent.click(screen.getByRole('menuitem', { name: 'New chat' }));
    expect(onNewChat).toHaveBeenCalledOnce();
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

    rerender(
      <ChatConversationActions
        isSettingsOpen
        onArchive={onArchive}
        onNewChat={onNewChat}
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
        onArchive={() => undefined}
        onDebug={onDebug}
        onNewChat={() => undefined}
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
        isDebugOpen
        onArchive={() => undefined}
        onDebug={onDebug}
        onNewChat={() => undefined}
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
});
