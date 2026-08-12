import { describe, expect, it } from 'vitest';

import {
  deriveComposerBusyCapabilities,
  deriveComposerContentCapabilities,
} from '~/components/composer/composerCapabilities.helpers';

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

const baseBusyInput = {
  isSubmitting: false,
  isUploading: false,
  voice: idleVoice,
  enhance: idleEnhance,
};

const baseContentInput = {
  hasContent: false,
  isFocused: false,
  showAttachments: false,
  isInteractionBusy: false,
  voice: idleVoice,
  enhance: idleEnhance,
};

describe('deriveComposerBusyCapabilities', () => {
  it('allows media/voice and reports idle when nothing is busy', () => {
    expect(deriveComposerBusyCapabilities(baseBusyInput)).toEqual({
      canPickMedia: true,
      canToggleVoice: true,
      isInteractionBusy: false,
    });
  });

  it('blocks every busy-gated action while submitting', () => {
    const result = deriveComposerBusyCapabilities({ ...baseBusyInput, isSubmitting: true });
    expect(result.canPickMedia).toBe(false);
    expect(result.canToggleVoice).toBe(false);
    expect(result.isInteractionBusy).toBe(true);
  });

  it('blocks every busy-gated action while uploading', () => {
    const result = deriveComposerBusyCapabilities({ ...baseBusyInput, isUploading: true });
    expect(result.canPickMedia).toBe(false);
    expect(result.canToggleVoice).toBe(false);
  });

  it('always allows toggling voice while actively recording, even if otherwise busy', () => {
    const result = deriveComposerBusyCapabilities({
      ...baseBusyInput,
      isSubmitting: true,
      voice: { ...idleVoice, isRecording: true },
    });
    expect(result.canToggleVoice).toBe(true);
  });

  it('blocks voice toggle while cleanup is running even when nothing else is busy', () => {
    const result = deriveComposerBusyCapabilities({
      ...baseBusyInput,
      voice: { ...idleVoice, isCleaningVoice: true },
    });
    expect(result.canToggleVoice).toBe(false);
  });

  it('blocks voice toggle when recording is happening elsewhere', () => {
    const result = deriveComposerBusyCapabilities({
      ...baseBusyInput,
      voice: { ...idleVoice, isRecordingElsewhere: true },
    });
    expect(result.canToggleVoice).toBe(false);
  });
});

describe('deriveComposerContentCapabilities', () => {
  it('disables submit and enhance when idle with no content', () => {
    expect(deriveComposerContentCapabilities(baseContentInput)).toEqual({
      canSubmit: false,
      canOpenEnhance: false,
      isColumnLayout: false,
    });
  });

  it('enables submit and enhance once there is content and nothing is busy', () => {
    const result = deriveComposerContentCapabilities({ ...baseContentInput, hasContent: true });
    expect(result.canSubmit).toBe(true);
    expect(result.canOpenEnhance).toBe(true);
    expect(result.isColumnLayout).toBe(true);
  });

  it('blocks submit and enhance while interaction is busy, regardless of content', () => {
    const result = deriveComposerContentCapabilities({
      ...baseContentInput,
      hasContent: true,
      isInteractionBusy: true,
    });
    expect(result.canSubmit).toBe(false);
    expect(result.canOpenEnhance).toBe(false);
  });

  it('blocks enhance while voice cleanup is running even with content and no other busy state', () => {
    const result = deriveComposerContentCapabilities({
      ...baseContentInput,
      hasContent: true,
      voice: { ...idleVoice, isCleaningVoice: true },
    });
    expect(result.canOpenEnhance).toBe(false);
    // Cleanup doesn't count as isInteractionBusy on its own, so submit still can.
    expect(result.canSubmit).toBe(true);
  });

  it('forces column layout while recording even with no content or focus', () => {
    const result = deriveComposerContentCapabilities({
      ...baseContentInput,
      voice: { ...idleVoice, isRecording: true },
    });
    expect(result.isColumnLayout).toBe(true);
  });

  it('forces column layout while the enhance panel is open', () => {
    const result = deriveComposerContentCapabilities({
      ...baseContentInput,
      enhance: { ...idleEnhance, isEnhanceOpen: true },
    });
    expect(result.isColumnLayout).toBe(true);
  });

  it('forces column layout when focused, independent of content', () => {
    const result = deriveComposerContentCapabilities({ ...baseContentInput, isFocused: true });
    expect(result.isColumnLayout).toBe(true);
  });

  it('forces column layout when the attachment row is showing', () => {
    const result = deriveComposerContentCapabilities({
      ...baseContentInput,
      showAttachments: true,
    });
    expect(result.isColumnLayout).toBe(true);
  });
});
