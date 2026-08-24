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
    expect(screen.getByText('Hello from the assistant').closest('.is-assistant')).toBeTruthy();
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

  it('renders reasoning, referenced notes, timestamps, failures, and opt-in debug details', () => {
    render(
      <ChatMessage
        formatTimestamp={() => '10:30 AM'}
        message={message({
          content: 'Answer',
          createdAt: '2026-08-24T17:30:00.000Z',
          failed: true,
          referencedNotes: [{ id: 'note-1', title: 'Release plan' }],
          reasoning: 'I compared the release constraints.',
        })}
        showDebug
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reasoning' }));
    expect(screen.getByText('I compared the release constraints.')).toBeTruthy();
    expect(screen.getByLabelText('Referenced note: Release plan')).toBeTruthy();
    expect(screen.getByLabelText('Sent 10:30 AM')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Response interrupted.');
    expect(screen.getByText('Debug details')).toBeTruthy();
  });
});
