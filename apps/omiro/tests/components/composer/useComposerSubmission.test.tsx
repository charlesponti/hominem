// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComposerProps } from '~/components/composer/composer.types';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockImpactAsync = vi.fn().mockResolvedValue(undefined);
const mockSubmitNote = vi.fn().mockResolvedValue(undefined);
const mockSubmitStartChat = vi.fn().mockResolvedValue(undefined);
const mockAutoUpdateChatTitle = vi.fn().mockResolvedValue(undefined);
const mockReadChatDraft = vi.fn().mockReturnValue('');
const mockWriteChatDraft = vi.fn();
const mockClearChatDraft = vi.fn();

let mockIsSaving = false;
let mockIsStartingChat = false;

vi.mock('expo-haptics', () => ({
  impactAsync: mockImpactAsync,
  ImpactFeedbackStyle: { Light: 'light' },
}));

vi.mock('~/components/composer/useNoteSubmission', () => ({
  useNoteSubmission: () => ({ isSaving: mockIsSaving, submitNote: mockSubmitNote }),
}));

vi.mock('~/components/composer/useStartChatSubmission', () => ({
  useStartChatSubmission: () => ({
    isStartingChat: mockIsStartingChat,
    submitStartChat: mockSubmitStartChat,
  }),
}));

vi.mock('~/services/chat', () => ({
  useAutoUpdateChatTitle: () => mockAutoUpdateChatTitle,
}));

vi.mock('~/services/navigation/launch-state', () => ({
  readChatDraft: mockReadChatDraft,
  writeChatDraft: mockWriteChatDraft,
  clearChatDraft: mockClearChatDraft,
}));

const { useComposerSubmission } = await import('~/components/composer/useComposerSubmission');

function inboxProps(overrides: Partial<Extract<ComposerProps, { mode: 'inbox' }>> = {}) {
  return {
    mode: 'inbox' as const,
    initialMessage: 'draft text',
    onDraftChange: vi.fn(),
    onClearDraft: vi.fn(),
    onComplete: vi.fn(),
    ...overrides,
  };
}

function chatProps(overrides: Partial<Extract<ComposerProps, { mode: 'chat' }>> = {}) {
  return {
    mode: 'chat' as const,
    chatId: 'chat-1',
    chatSend: {
      sendChatMessage: vi.fn().mockResolvedValue(undefined),
      isChatSending: false,
    },
    ...overrides,
  };
}

describe('useComposerSubmission', () => {
  beforeEach(() => {
    mockIsSaving = false;
    mockIsStartingChat = false;
    mockReadChatDraft.mockReturnValue('');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('note submission (inbox mode)', () => {
    it('submits a note and skips the other submission paths', async () => {
      const props = inboxProps();
      const { result } = renderHookWithQueryClient(() => useComposerSubmission(props));
      const clearComposer = vi.fn();

      await act(async () => {
        await result.current.submit(
          { canSubmit: true, clearComposer, fileIds: ['f1'], message: 'hello' },
          'note',
        );
      });

      expect(mockSubmitNote).toHaveBeenCalledWith({
        clearComposer,
        fileIds: ['f1'],
        message: 'hello',
      });
      expect(mockSubmitStartChat).not.toHaveBeenCalled();
      expect(mockImpactAsync).not.toHaveBeenCalled();
    });

    it('does nothing when canSubmit is false', async () => {
      const props = inboxProps();
      const { result } = renderHookWithQueryClient(() => useComposerSubmission(props));
      const clearComposer = vi.fn();

      await act(async () => {
        await result.current.submit(
          { canSubmit: false, clearComposer, fileIds: [], message: 'hello' },
          'note',
        );
      });

      expect(mockSubmitNote).not.toHaveBeenCalled();
    });
  });

  describe('start-chat submission (inbox mode)', () => {
    it('starts a chat, forwarding the composer onComplete callback', async () => {
      const props = inboxProps();
      const { result } = renderHookWithQueryClient(() => useComposerSubmission(props));
      const clearComposer = vi.fn();

      await act(async () => {
        await result.current.submit(
          { canSubmit: true, clearComposer, fileIds: [], message: 'hello' },
          'start-chat',
        );
      });

      expect(mockSubmitStartChat).toHaveBeenCalledWith({
        clearComposer,
        fileIds: [],
        message: 'hello',
        onComplete: props.onComplete,
      });
    });
  });

  describe('message submission (chat mode)', () => {
    it('sends the message, fires the completion haptic, clears the composer immediately, and updates the chat title on success', async () => {
      const sendChatMessage = vi.fn().mockResolvedValue(undefined);
      const props = chatProps({ chatSend: { sendChatMessage, isChatSending: false } });
      const { result } = renderHookWithQueryClient(() => useComposerSubmission(props));
      const clearComposer = vi.fn();

      let resolveSend: () => void = () => {};
      sendChatMessage.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSend = resolve;
          }),
      );

      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = result.current.submit(
          {
            canSubmit: true,
            clearComposer,
            fileIds: ['f1'],
            message: '  hello there  ',
            responseModality: 'text',
          },
          'message',
        );
      });

      // clearComposer fires as soon as the send is initiated -- it does not
      // wait for the send promise to settle.
      expect(clearComposer).toHaveBeenCalledTimes(1);
      expect(mockAutoUpdateChatTitle).not.toHaveBeenCalled();

      await act(async () => {
        resolveSend();
        await submitPromise;
      });

      expect(sendChatMessage).toHaveBeenCalledWith({
        message: 'hello there',
        fileIds: ['f1'],
        noteIds: [],
        responseModality: 'text',
      });
      expect(mockImpactAsync).toHaveBeenCalledTimes(1);
      expect(mockAutoUpdateChatTitle).toHaveBeenCalledWith('hello there');
    });

    it('does not send while another chat message is already sending', async () => {
      const sendChatMessage = vi.fn();
      const props = chatProps({ chatSend: { sendChatMessage, isChatSending: true } });
      const { result } = renderHookWithQueryClient(() => useComposerSubmission(props));
      const clearComposer = vi.fn();

      await act(async () => {
        await result.current.submit(
          { canSubmit: true, clearComposer, fileIds: [], message: 'hello' },
          'message',
        );
      });

      expect(sendChatMessage).not.toHaveBeenCalled();
      expect(clearComposer).not.toHaveBeenCalled();
    });

    it('swallows a send failure without updating the chat title', async () => {
      const sendChatMessage = vi.fn().mockRejectedValue(new Error('network dropped'));
      const props = chatProps({ chatSend: { sendChatMessage, isChatSending: false } });
      const { result } = renderHookWithQueryClient(() => useComposerSubmission(props));
      const clearComposer = vi.fn();

      await act(async () => {
        await result.current.submit(
          { canSubmit: true, clearComposer, fileIds: [], message: 'hello' },
          'message',
        );
      });

      expect(clearComposer).toHaveBeenCalledTimes(1);
      expect(mockAutoUpdateChatTitle).not.toHaveBeenCalled();
    });
  });

  describe('derived state', () => {
    it('uses the inbox initialMessage and combines isSaving/isStartingChat into isSubmitting for inbox mode', () => {
      mockIsSaving = true;
      const props = inboxProps({ initialMessage: 'from props' });
      const { result } = renderHookWithQueryClient(() => useComposerSubmission(props));

      expect(result.current.initialMessage).toBe('from props');
      expect(result.current.isSubmitting).toBe(true);
      expect(result.current.onDraftChange).toBe(props.onDraftChange);
      expect(result.current.onClearDraft).toBe(props.onClearDraft);
    });

    it('reads the persisted chat draft and derives isSubmitting from isChatSending for chat mode', () => {
      mockReadChatDraft.mockReturnValue('persisted draft');
      const props = chatProps({ chatSend: { sendChatMessage: vi.fn(), isChatSending: true } });
      const { result } = renderHookWithQueryClient(() => useComposerSubmission(props));

      expect(mockReadChatDraft).toHaveBeenCalledWith('chat-1');
      expect(result.current.initialMessage).toBe('persisted draft');
      expect(result.current.isSubmitting).toBe(true);

      act(() => result.current.onDraftChange?.('typing...'));
      expect(mockWriteChatDraft).toHaveBeenCalledWith('chat-1', 'typing...');

      act(() => result.current.onClearDraft?.());
      expect(mockClearChatDraft).toHaveBeenCalledWith('chat-1');
    });
  });
});
