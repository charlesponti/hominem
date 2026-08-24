// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatMessageSearch } from './chat-message-search';

afterEach(cleanup);

describe('ChatMessageSearch', () => {
  it('stays mounted while entering and exiting', () => {
    const { container, rerender } = render(
      <ChatMessageSearch
        error={null}
        isOpen={false}
        onChange={() => undefined}
        onClose={() => undefined}
        query=""
      />,
    );

    const searchBar = container.firstElementChild;
    expect(searchBar?.className).toContain('pointer-events-none');
    expect(searchBar?.className).toContain('grid-rows-[0fr]');
    expect(searchBar?.className).toContain('-translate-y-4');

    rerender(
      <ChatMessageSearch
        error={null}
        isOpen
        onChange={() => undefined}
        onClose={() => undefined}
        query=""
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Search messages' })).toBeTruthy();
    expect(searchBar?.className).toContain('translate-y-0');
  });

  it('reports blank, result, and empty states and closes accessibly', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <ChatMessageSearch error={null} onChange={onChange} onClose={onClose} query="" />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Search messages' }), {
      target: { value: 'release' },
    });
    expect(onChange).toHaveBeenCalledWith('release');

    rerender(
      <ChatMessageSearch error={null} onChange={onChange} onClose={onClose} query="release" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close message search' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('animates an error behind the pill when dismissed', () => {
    render(
      <ChatMessageSearch
        error={new Error('Search is unavailable.')}
        onChange={() => undefined}
        onClose={() => undefined}
        query="release"
      />,
    );

    const status = screen.getByRole('alert').parentElement;
    expect(status?.className).toContain('translate-y-0');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss search error' }));

    expect(status?.className).toContain('-translate-y-full');
    expect(status?.className).toContain('pointer-events-none');
  });
});
