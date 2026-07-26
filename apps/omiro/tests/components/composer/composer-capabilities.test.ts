import { describe, expect, it } from 'vitest';

import { deriveComposerCapabilities } from '~/components/composer/composerCapabilities.helpers';

const idleVoice = {
  isBusy: false,
  isRecording: false,
  isCleaningVoice: false,
  isRecordingElsewhere: false,
};

const idleEnhance = {
  isEnhancing: false,
  isEnhanceOpen: false,
};

const baseInput = {
  hasContent: false,
  isSubmitting: false,
  isUploading: false,
  isFocused: false,
  showAttachments: false,
  voice: idleVoice,
  enhance: idleEnhance,
};

describe('deriveComposerCapabilities', () => {
  it('disables submit, enhance, and voice-toggle-driven actions when idle with no content', () => {
    expect(deriveComposerCapabilities(baseInput)).toEqual({
      canSubmit: false,
      canOpenEnhance: false,
      canPickMedia: true,
      canToggleVoice: true,
      isColumnLayout: false,
    });
  });

  it('enables submit and enhance once there is content and nothing is busy', () => {
    const result = deriveComposerCapabilities({ ...baseInput, hasContent: true });
    expect(result.canSubmit).toBe(true);
    expect(result.canOpenEnhance).toBe(true);
    expect(result.isColumnLayout).toBe(true);
  });

  it('blocks every busy-gated action while submitting, regardless of content', () => {
    const result = deriveComposerCapabilities({
      ...baseInput,
      hasContent: true,
      isSubmitting: true,
    });
    expect(result.canSubmit).toBe(false);
    expect(result.canOpenEnhance).toBe(false);
    expect(result.canPickMedia).toBe(false);
    expect(result.canToggleVoice).toBe(false);
  });

  it('blocks every busy-gated action while uploading', () => {
    const result = deriveComposerCapabilities({
      ...baseInput,
      hasContent: true,
      isUploading: true,
    });
    expect(result.canSubmit).toBe(false);
    expect(result.canOpenEnhance).toBe(false);
    expect(result.canPickMedia).toBe(false);
    expect(result.canToggleVoice).toBe(false);
  });

  it('always allows toggling voice while actively recording, even if otherwise busy', () => {
    const result = deriveComposerCapabilities({
      ...baseInput,
      isSubmitting: true,
      voice: { ...idleVoice, isRecording: true },
    });
    expect(result.canToggleVoice).toBe(true);
  });

  it('blocks voice toggle while cleanup is running even when nothing else is busy', () => {
    const result = deriveComposerCapabilities({
      ...baseInput,
      voice: { ...idleVoice, isCleaningVoice: true },
    });
    expect(result.canToggleVoice).toBe(false);
  });

  it('blocks enhance while voice cleanup is running even with content and no other busy state', () => {
    const result = deriveComposerCapabilities({
      ...baseInput,
      hasContent: true,
      voice: { ...idleVoice, isCleaningVoice: true },
    });
    expect(result.canOpenEnhance).toBe(false);
    // Cleanup doesn't count as isInteractionBusy on its own, so submit still can.
    expect(result.canSubmit).toBe(true);
  });

  it('blocks voice toggle when recording is happening elsewhere', () => {
    const result = deriveComposerCapabilities({
      ...baseInput,
      voice: { ...idleVoice, isRecordingElsewhere: true },
    });
    expect(result.canToggleVoice).toBe(false);
  });

  it('forces column layout while recording even with no content or focus', () => {
    const result = deriveComposerCapabilities({
      ...baseInput,
      voice: { ...idleVoice, isRecording: true },
    });
    expect(result.isColumnLayout).toBe(true);
  });

  it('forces column layout while the enhance panel is open', () => {
    const result = deriveComposerCapabilities({
      ...baseInput,
      enhance: { ...idleEnhance, isEnhanceOpen: true },
    });
    expect(result.isColumnLayout).toBe(true);
  });

  it('forces column layout when focused, independent of content', () => {
    const result = deriveComposerCapabilities({ ...baseInput, isFocused: true });
    expect(result.isColumnLayout).toBe(true);
  });

  it('forces column layout when the attachment row is showing', () => {
    const result = deriveComposerCapabilities({ ...baseInput, showAttachments: true });
    expect(result.isColumnLayout).toBe(true);
  });
});
