export interface ComposerCapabilitiesVoiceInput {
  isBusy: boolean;
  isRecording: boolean;
  isCleaningVoice: boolean;
  isRecordingElsewhere: boolean;
}

export interface ComposerBusyCapabilitiesInput {
  isSubmitting: boolean;
  isUploading: boolean;
  voice: ComposerCapabilitiesVoiceInput;
}

export interface ComposerBusyCapabilities {
  canPickMedia: boolean;
  canToggleVoice: boolean;
  isInteractionBusy: boolean;
}

// The half of capability derivation that never depends on draft content --
// safe to compute anywhere `hasContent` isn't reactively tracked (i.e.
// outside the message-store-subscribed leaf). See
// deriveComposerContentCapabilities for the other half.
export function deriveComposerBusyCapabilities({
  isSubmitting,
  isUploading,
  voice,
}: ComposerBusyCapabilitiesInput): ComposerBusyCapabilities {
  const isInteractionBusy = isSubmitting || isUploading || voice.isBusy;
  const canPickMedia = !isInteractionBusy;
  const canToggleVoice =
    voice.isRecording ||
    (!isInteractionBusy && !voice.isCleaningVoice && !voice.isRecordingElsewhere);

  return { canPickMedia, canToggleVoice, isInteractionBusy };
}

export interface ComposerContentCapabilitiesInput {
  hasContent: boolean;
  isFocused: boolean;
  showAttachments: boolean;
  isInteractionBusy: boolean;
  voice: Pick<ComposerCapabilitiesVoiceInput, 'isRecording' | 'isCleaningVoice'>;
}

export interface ComposerContentCapabilities {
  canSubmit: boolean;
  canOpenEnhance: boolean;
  isColumnLayout: boolean;
}

// The half that depends on `hasContent` -- draft text changes every
// keystroke, so only call this from the component subscribed to the message
// store (ComposerToolbar). Call it from useComposerController and every
// keystroke re-renders the whole composer tree.
export function deriveComposerContentCapabilities({
  hasContent,
  isFocused,
  showAttachments,
  isInteractionBusy,
  voice,
}: ComposerContentCapabilitiesInput): ComposerContentCapabilities {
  const canSubmit = hasContent && !isInteractionBusy;
  const canOpenEnhance = hasContent && !isInteractionBusy && !voice.isCleaningVoice;

  // Transcription-failed errors don't count here anymore -- they render as a
  // popover above the composer (Composer's errorBanner slot), not inline
  // body content, so they shouldn't force column layout. Enhance is a
  // separate form-sheet route now too, so it has no inline state either.
  const isColumnLayout = isFocused || hasContent || showAttachments || voice.isRecording;

  return { canSubmit, canOpenEnhance, isColumnLayout };
}
