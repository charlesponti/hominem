// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessageView } from '~/lib/types/chat';

vi.mock('./speech-player', () => ({
  SpeechPlayer: () => <button type="button">Listen to response</button>,
}));

import { ChatMessage } from './chat-message';

afterEach(cleanup);

function message(overrides: Partial<ChatMessageView> = {}): ChatMessageView {
  return {
    id: 'message-1',
    chatId: 'chat-1',
    content: 'Hello from the assistant',
    role: 'assistant',
    ...overrides,
  } as ChatMessageView;
}

describe('ChatMessage', () => {
  it('renders the message role and assistant speech control', () => {
    render(
      <ChatMessage
        message={message()}
        onActivateSpeech={() => undefined}
        onDeactivateSpeech={() => undefined}
        speechSrc="/speech/message-1"
      />,
    );

    expect(screen.getByText('Hello from the assistant')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Listen to response' })).toBeTruthy();
    expect(
      screen
        .getByText('Hello from the assistant')
        .closest('.is-assistant')
        ?.getAttribute('data-presentation-state'),
    ).toBe('complete');
  });

  it('renders tool approval actions and reports the selected action', () => {
    const onApproveTool = vi.fn();
    const onRejectTool = vi.fn();
    render(
      <ChatMessage
        message={message({
          content: '',
          toolCalls: [
            {
              type: 'tool-call',
              toolCallId: 'tool-1',
              toolName: 'delete_note',
              args: { noteId: 'note-1' },
              preview: { title: 'Draft note' },
              status: 'pending',
            },
          ],
        })}
        onApproveTool={onApproveTool}
        onRejectTool={onRejectTool}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApproveTool).toHaveBeenCalledWith({ messageId: 'message-1', toolCallId: 'tool-1' });
    expect(screen.getByText('Draft note')).toBeTruthy();
  });

  it('does not render speech controls for user or streaming messages', () => {
    const { rerender } = render(
      <ChatMessage
        message={message({ role: 'user', content: 'User message' })}
        onActivateSpeech={() => undefined}
        onDeactivateSpeech={() => undefined}
        speechSrc="/speech/message-1"
      />,
    );
    expect(screen.queryByRole('button', { name: 'Listen to response' })).toBeNull();

    rerender(
      <ChatMessage
        message={message({ isStreaming: true })}
        onActivateSpeech={() => undefined}
        onDeactivateSpeech={() => undefined}
        speechSrc="/speech/message-1"
      />,
    );
    expect(screen.queryByRole('button', { name: 'Listen to response' })).toBeNull();
  });

  it('exposes a distinct accessible streaming state inside the message', () => {
    render(<ChatMessage message={message({ content: 'Partial answer', isStreaming: true })} />);

    expect(screen.getByRole('status', { name: 'Response is streaming' })).toBeTruthy();
    expect(screen.getByLabelText('Message streaming')).toBeTruthy();
  });

  it('edits persisted user messages and rejects empty content', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <ChatMessage
        message={message({ role: 'user', content: 'Original message' })}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    const input = screen.getByRole('textbox', { name: 'Edit message' });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save edit' }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText('Message cannot be empty.')).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Updated message' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save edit' }));
    expect(onEdit).toHaveBeenCalledWith('message-1', 'Updated message');
  });

  it('confirms user-message deletion and surfaces failures', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Unable to delete this message.'));
    render(
      <ChatMessage
        message={message({ role: 'user', content: 'Delete this message' })}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete user message' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByRole('alertdialog').textContent).toContain(
      'This will delete this message and all later messages',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete message' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('message-1'));
    await waitFor(() =>
      expect(screen.getByText('Unable to delete this message. Try again when ready.')).toBeTruthy(),
    );
  });

  it('exposes copy and share actions only for non-empty assistant messages', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { rerender } = render(<ChatMessage message={message()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy assistant message' }));
    expect(writeText).toHaveBeenCalledWith('Hello from the assistant');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copied assistant message' })).toBeTruthy(),
    );

    rerender(<ChatMessage message={message({ content: '' })} />);
    expect(screen.queryByRole('button', { name: 'Copy assistant message' })).toBeNull();
    rerender(<ChatMessage message={message({ isStreaming: true })} />);
    expect(screen.queryByRole('button', { name: 'Share assistant message' })).toBeNull();
  });

  it('reports native share success and failure accessibly', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    render(<ChatMessage message={message()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share assistant message' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Shared assistant message' })).toBeTruthy(),
    );
    expect(share).toHaveBeenCalledWith({ text: 'Hello from the assistant' });

    share.mockRejectedValueOnce(new Error('Share cancelled'));
    fireEvent.click(screen.getByRole('button', { name: 'Shared assistant message' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Share assistant message failed' })).toBeTruthy(),
    );
  });

  it('uses the download fallback when native share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValue('blob:message'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    render(<ChatMessage message={message()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share assistant message' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Shared assistant message' })).toBeTruthy(),
    );
  });

  it('guards regeneration during an active generation and exposes cancellation', () => {
    const onRegenerate = vi.fn();
    const onCancelRegenerate = vi.fn();
    const { rerender } = render(
      <ChatMessage
        isGenerationActive
        message={message()}
        onRegenerate={onRegenerate}
        onCancelRegenerate={onCancelRegenerate}
      />,
    );

    expect(screen.getByRole('button', { name: 'Regenerate response' })).toHaveProperty(
      'disabled',
      true,
    );
    rerender(
      <ChatMessage
        isRegenerating
        message={message()}
        onCancelRegenerate={onCancelRegenerate}
        onRegenerate={onRegenerate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Stop regenerating response' }));
    expect(onRegenerate).not.toHaveBeenCalled();
    expect(onCancelRegenerate).toHaveBeenCalledOnce();
  });

  it('replaces the targeted answer with in-place Thinking without adding a second message', async () => {
    const { rerender } = render(
      <ChatMessage
        isRegenerating
        message={message()}
        onCancelRegenerate={() => undefined}
        onRegenerate={() => undefined}
        regenerationStatus="streaming"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Thinking')).toBeTruthy();
      expect(screen.queryByText('Hello from the assistant')).toBeNull();
    });

    rerender(
      <ChatMessage
        message={message({ updatedAt: '2026-08-24T17:31:00.000Z' })}
        onRegenerate={() => undefined}
        regenerationStatus="stopping"
      />,
    );
    const stoppingButton = screen.getByRole('button', { name: 'Stopping regeneration' });
    expect(stoppingButton).toHaveProperty('disabled', true);
    rerender(
      <ChatMessage
        message={message({ updatedAt: '2026-08-24T17:31:00.000Z' })}
        onRegenerate={() => undefined}
        regenerationStatus="cancelled"
      />,
    );
    await waitFor(() => expect(screen.getByText('Hello from the assistant')).toBeTruthy());
  });

  it('keeps regeneration failures retryable for the target message', () => {
    const onRetryRegenerate = vi.fn();
    render(
      <ChatMessage
        message={message()}
        onRegenerate={() => undefined}
        onRetryRegenerate={onRetryRegenerate}
        regenerationError="Regeneration failed"
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('Regeneration failed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetryRegenerate).toHaveBeenCalledOnce();
  });

  it('renders reasoning, failures, and opt-in debug details', () => {
    render(
      <ChatMessage
        formatTimestamp={() => '10:30 AM'}
        message={message({
          content: 'Answer',
          createdAt: '2026-08-24T17:30:00.000Z',
          failed: true,
          reasoning: 'I compared the release constraints.',
        })}
        showDebug
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reasoning' }));
    expect(screen.getByText('I compared the release constraints.')).toBeTruthy();
    expect(screen.queryByLabelText('Sent 10:30 AM')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(
      'Response interrupted. The previous content is preserved.',
    );
    expect(screen.getByLabelText('Message interrupted')).toBeTruthy();
    expect(screen.getByText('Debug details')).toBeTruthy();
  });
});
