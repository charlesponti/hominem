// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PromptInput, PromptInputSubmit, PromptInputTextarea } from './prompt-input';

afterEach(cleanup);

describe('PromptInput', () => {
  it('submits the typed message with no attachments', async () => {
    const onSubmit = vi.fn();
    render(
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea />
        <PromptInputSubmit />
      </PromptInput>,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello there' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toEqual({ text: 'Hello there', files: [] });
  });

  it('submits on Enter but not on Shift+Enter', async () => {
    const onSubmit = vi.fn();
    render(
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea />
      </PromptInput>,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: 'Enter' });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  });
});

describe('PromptInputSubmit', () => {
  it('shows a submit icon by default and a stop button while streaming', () => {
    const onStop = vi.fn();
    const { rerender } = render(<PromptInputSubmit status="ready" />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();

    rerender(<PromptInputSubmit onStop={onStop} status="streaming" />);
    const stopButton = screen.getByRole('button', { name: 'Stop' });
    expect(stopButton.getAttribute('type')).toBe('button');

    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('shows a generating label while submitted', () => {
    render(<PromptInputSubmit status="submitted" />);
    expect(screen.getByRole('button', { name: 'Generating' })).toBeTruthy();
  });
});
