// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatHomePage } from './chat-home-page';

vi.mock('./chat-composer', () => ({
  ChatComposer: ({
    draft,
    onChangeDraft,
    onSubmit,
  }: {
    draft: string;
    onChangeDraft: (value: string) => void;
    onSubmit: () => void;
  }) => (
    <>
      <textarea
        aria-label="Chat message"
        onChange={(event) => onChangeDraft(event.target.value)}
        value={draft}
      />
      <button onClick={onSubmit} type="button">
        Send
      </button>
    </>
  ),
}));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ChatHomePage', () => {
  it('keeps the chat-first entry point focused on starting a conversation', () => {
    render(
      <ChatHomePage
        draft=""
        isSubmitting={false}
        onChangeDraft={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Start a conversation' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Chat message' })).toBeTruthy();
  });

  it('forwards draft changes and submit', () => {
    const onChangeDraft = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ChatHomePage
        draft="Hello"
        isSubmitting={false}
        onChangeDraft={onChangeDraft}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Chat message' }), {
      target: { value: 'Hello again' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onChangeDraft).toHaveBeenCalledWith('Hello again');
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
