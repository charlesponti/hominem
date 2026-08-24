// @vitest-environment jsdom

import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./speech-player', () => ({
  SpeechPlayer: () => <button type="button">Listen to response</button>,
}));

import { ChatMessage } from './chat-message';

afterEach(cleanup);

function message(overrides: Partial<ChatMessageDto> = {}): ChatMessageDto {
  return {
    id: 'message-1',
    chatId: 'chat-1',
    content: 'Hello from the assistant',
    role: 'assistant',
    ...overrides,
  } as ChatMessageDto;
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
});
