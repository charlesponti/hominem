// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatComposer } from './chat-composer';

vi.mock('~/components/chat/persona', () => ({
  Persona: ({ className }: { className?: string }) => (
    <span aria-hidden="true" className={className} data-testid="persona" />
  ),
}));

vi.mock('~/components/chat/prompt-input', () => ({
  PromptInput: ({ children, onSubmit }: { children: React.ReactNode; onSubmit: () => void }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  ),
  PromptInputBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputButton: ({
    children,
    ...props
  }: React.ComponentProps<'button'> & { asChild?: boolean }) => {
    const buttonProps = { ...props };
    delete buttonProps.asChild;
    return <button {...buttonProps}>{children}</button>;
  },
  PromptInputFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputSubmit: ({
    disabled,
    onStop,
    status,
  }: {
    disabled?: boolean;
    onStop?: () => void;
    status: string;
  }) => (
    <button disabled={disabled} onClick={status === 'streaming' ? onStop : undefined} type="button">
      {status === 'streaming' ? 'Stop' : 'Send'}
    </button>
  ),
  PromptInputTextarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
  PromptInputTools: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ChatComposer', () => {
  it('does not submit an empty draft', () => {
    const onSubmit = vi.fn();
    render(<ChatComposer draft="   " onChangeDraft={() => undefined} onSubmit={onSubmit} />);

    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a dismissible animated error badge while preserving the draft', () => {
    const onChangeDraft = vi.fn();
    render(
      <ChatComposer
        draft="Try again"
        error="Unable to send"
        onChangeDraft={onChangeDraft}
        onSubmit={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Chat message' }), {
      target: { value: 'Updated draft' },
    });

    expect(onChangeDraft).toHaveBeenCalledWith('Updated draft');
    expect(screen.getByText('Unable to send')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));

    expect(screen.queryByText('Unable to send')).toBeNull();
  });

  it('dismisses the current error when a new message is submitted', () => {
    const onSubmit = vi.fn();
    render(
      <ChatComposer
        draft="Try again"
        error="Unable to send"
        onChangeDraft={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.queryByText('Unable to send')).toBeNull();
  });

  it('exposes retry without changing the preserved draft', () => {
    const onRetry = vi.fn();
    render(
      <ChatComposer
        draft="Try again"
        error="Unable to send"
        onChangeDraft={() => undefined}
        onRetry={onRetry}
        onSubmit={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry sending' }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText('Unable to send')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Chat message' })).toHaveProperty(
      'value',
      'Try again',
    );
  });

  it('renders cancellation as a neutral status message', () => {
    render(
      <ChatComposer
        draft=""
        onChangeDraft={() => undefined}
        onSubmit={() => undefined}
        statusMessage="Stopped."
      />,
    );

    expect(screen.getByText('Stopped.').getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the stop control enabled while a response is streaming', () => {
    const onStop = vi.fn();
    render(
      <ChatComposer
        draft=""
        isStreaming
        isSubmitting
        onChangeDraft={() => undefined}
        onStop={onStop}
        onSubmit={() => undefined}
      />,
    );

    const stop = screen.getByRole('button', { name: 'Stop' });
    expect(stop.getAttribute('disabled')).toBeNull();
    fireEvent.click(stop);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('removes an attachment through its accessible chip', () => {
    const onRemoveAttachment = vi.fn();
    render(
      <ChatComposer
        attachments={[{ id: 'file-1', originalName: 'notes.pdf' }]}
        draft=""
        onChangeDraft={() => undefined}
        onRemoveAttachment={onRemoveAttachment}
        onSubmit={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /notes\.pdf/i }));

    expect(onRemoveAttachment).toHaveBeenCalledWith('file-1');
  });

  it('transforms the voice button into Persona while preserving the composer controls', () => {
    const onToggleVoice = vi.fn();
    render(
      <ChatComposer
        draft="Ask with my voice"
        onAttachFiles={() => undefined}
        isListening
        isVoiceSupported
        onChangeDraft={() => undefined}
        onSubmit={() => undefined}
        onToggleVoice={onToggleVoice}
      />,
    );

    const voiceButton = screen.getByTestId('chat-voice-input');
    expect(voiceButton.getAttribute('aria-label')).toBe('Stop voice input');
    expect(voiceButton.getAttribute('data-voice-state')).toBe('listening');
    expect(screen.getByTestId('persona')).toBeTruthy();
    expect(screen.getByTestId('chat-file-input')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
    fireEvent.click(voiceButton);
    expect(onToggleVoice).toHaveBeenCalledOnce();
  });

  it('keeps the voice button keyboard focusable when ready', () => {
    render(
      <ChatComposer
        draft="Ask with my voice"
        isVoiceSupported
        onChangeDraft={() => undefined}
        onSubmit={() => undefined}
        onToggleVoice={() => undefined}
      />,
    );

    const voiceButton = screen.getByTestId('chat-voice-input');
    expect(voiceButton.getAttribute('aria-label')).toBe('Voice input');
    expect(voiceButton.getAttribute('data-voice-state')).toBe('ready');
    expect(screen.queryByTestId('persona')).toBeTruthy();
    voiceButton.focus();
    expect(document.activeElement).toBe(voiceButton);
  });
});
