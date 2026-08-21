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

// The half of composer capability derivation that never depends on draft
// content -- safe to compute wherever `hasContent` isn't reactively tracked
// (i.e. outside the message-store-subscribed leaf). See
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

// The half that depends on `hasContent` -- draft text changes on every
// keystroke, so this should only be called from the component that
// subscribes to the message store (ComposerToolbar), not from
// useComposerController itself, or every keystroke re-renders the whole
// composer tree.
export function deriveComposerContentCapabilities({
  hasContent,
  isFocused,
  showAttachments,
  isInteractionBusy,
  voice,
}: ComposerContentCapabilitiesInput): ComposerContentCapabilities {
  const canSubmit = hasContent && !isInteractionBusy;
  const canOpenEnhance = hasContent && !isInteractionBusy && !voice.isCleaningVoice;

  // The transcription-failed error no longer counts here -- it renders as a popover
  // above the composer (Composer's errorBanner slot), not as inline body content,
  // so it shouldn't force the composer itself into column layout. Enhance no
  // longer has an inline state either -- it's a separate form-sheet route now.
  const isColumnLayout = isFocused || hasContent || showAttachments || voice.isRecording;

  return { canSubmit, canOpenEnhance, isColumnLayout };
}
