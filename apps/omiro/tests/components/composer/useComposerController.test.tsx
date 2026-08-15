// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockClearAttachments = vi.fn();
const mockMarkAttachmentsSubmitted = vi.fn();
const mockCloseEnhance = vi.fn();

let mockAttachments: { id: string; uploadedFile?: { id: string } }[] = [];
let mockErrors: string[] = [];
let mockIsUploading = false;
let mockVoiceIsBusy = false;

vi.mock('~/components/composer/ComposerContext', () => ({
  useComposerAttachments: () => ({
    attachments: mockAttachments,
    errors: mockErrors,
    isUploading: mockIsUploading,
    clearAttachments: mockClearAttachments,
    markAttachmentsSubmitted: mockMarkAttachmentsSubmitted,
  }),
}));

vi.mock('~/components/composer/useVoiceComposerInput', () => ({
  useVoiceComposerInput: () => ({
    isBusy: mockVoiceIsBusy,
    isRecording: false,
    isCleaningVoice: false,
    isRecordingElsewhere: false,
  }),
}));

vi.mock('~/services/ai', () => ({
  useInlineEnhance: () => ({
    isEnhancing: false,
    isEnhanceOpen: false,
    closeEnhance: mockCloseEnhance,
  }),
}));

const { useComposerController } = await import('~/components/composer/useComposerController');

describe('useComposerController', () => {
  beforeEach(() => {
    mockAttachments = [];
    mockErrors = [];
    mockIsUploading = false;
    mockVoiceIsBusy = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes the draft from initialMessage and exposes it via getMessage', () => {
    const { result } = renderHookWithQueryClient(() =>
      useComposerController({ initialMessage: 'hello world' }),
    );

    expect(result.current.getMessage()).toBe('hello world');
  });

  it('notifies onDraftChange when the message is set', () => {
    const onDraftChange = vi.fn();
    const { result } = renderHookWithQueryClient(() => useComposerController({ onDraftChange }));

    act(() => result.current.setMessage('typed text'));

    expect(onDraftChange).toHaveBeenCalledWith('typed text');
    expect(result.current.getMessage()).toBe('typed text');
  });

  it('shows attachments when there are attachments, errors, or an upload in progress', () => {
    mockErrors = ['upload failed'];
    const { result } = renderHookWithQueryClient(() => useComposerController({}));
    expect(result.current.showAttachments).toBe(true);
  });

  it('derives uploadedAttachmentIds only from attachments with an uploaded file', () => {
    mockAttachments = [
      { id: 'a1', uploadedFile: { id: 'file-1' } },
      { id: 'a2' },
      { id: 'a3', uploadedFile: { id: 'file-3' } },
    ];
    const { result } = renderHookWithQueryClient(() => useComposerController({}));
    expect(result.current.uploadedAttachmentIds).toEqual(['file-1', 'file-3']);
  });

  it('disables media picking and voice toggling while submitting', () => {
    const { result } = renderHookWithQueryClient(() =>
      useComposerController({ isSubmitting: true }),
    );
    expect(result.current.canPickMedia).toBe(false);
    expect(result.current.isInteractionBusy).toBe(true);
  });

  it('tracks input focus state', () => {
    const { result } = renderHookWithQueryClient(() => useComposerController({}));
    expect(result.current.isFocused).toBe(false);

    act(() => result.current.handleInputFocus());
    expect(result.current.isFocused).toBe(true);

    act(() => result.current.handleInputBlur());
    expect(result.current.isFocused).toBe(false);
  });

  it('clearComposer clears the draft, attachments, and enhance panel, and notifies onClearDraft', () => {
    const onClearDraft = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useComposerController({ initialMessage: 'draft', onClearDraft }),
    );

    act(() => result.current.clearComposer());

    expect(result.current.getMessage()).toBe('');
    expect(mockClearAttachments).toHaveBeenCalledTimes(1);
    expect(mockCloseEnhance).toHaveBeenCalledTimes(1);
    expect(onClearDraft).toHaveBeenCalledTimes(1);
  });

  it('resets manualEntryKind to the fixed entryMode (not null) after clearing when entryMode is not mixed', () => {
    const { result } = renderHookWithQueryClient(() =>
      useComposerController({ entryMode: 'note' }),
    );
    expect(result.current.manualEntryKind).toBe('note');

    act(() => result.current.setManualEntryKind('chat'));
    expect(result.current.manualEntryKind).toBe('chat');

    act(() => result.current.clearComposer());
    expect(result.current.manualEntryKind).toBe('note');
  });

  it('starts manualEntryKind as null in mixed entry mode', () => {
    const { result } = renderHookWithQueryClient(() => useComposerController({}));
    expect(result.current.manualEntryKind).toBeNull();
  });
});
