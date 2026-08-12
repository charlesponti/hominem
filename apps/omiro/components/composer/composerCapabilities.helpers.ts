export interface ComposerCapabilitiesVoiceInput {
  isBusy: boolean;
  isRecording: boolean;
  isCleaningVoice: boolean;
  isRecordingElsewhere: boolean;
}

export interface ComposerCapabilitiesEnhanceInput {
  isEnhancing: boolean;
  isEnhanceOpen: boolean;
}

export interface ComposerBusyCapabilitiesInput {
  isSubmitting: boolean;
  isUploading: boolean;
  voice: ComposerCapabilitiesVoiceInput;
  enhance: Pick<ComposerCapabilitiesEnhanceInput, 'isEnhancing'>;
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
  enhance,
}: ComposerBusyCapabilitiesInput): ComposerBusyCapabilities {
  const isInteractionBusy = isSubmitting || isUploading || voice.isBusy || enhance.isEnhancing;
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
  enhance: Pick<ComposerCapabilitiesEnhanceInput, 'isEnhanceOpen'>;
}

export interface ComposerContentCapabilities {
  canSubmit: boolean;
  canOpenEnhance: boolean;
  isColumnLayout: boolean;
}

// The half that depends on `hasContent` -- draft text changes on every
// keystroke, so this should only be called from the component that
// subscribes to the message store (ComposerActiveArea), not from
// useComposerController itself, or every keystroke re-renders the whole
// composer tree.
export function deriveComposerContentCapabilities({
  hasContent,
  isFocused,
  showAttachments,
  isInteractionBusy,
  voice,
  enhance,
}: ComposerContentCapabilitiesInput): ComposerContentCapabilities {
  const canSubmit = hasContent && !isInteractionBusy;
  const canOpenEnhance = hasContent && !isInteractionBusy && !voice.isCleaningVoice;

  // The transcription-failed error no longer counts here -- it renders as a popover
  // above the composer (ComposerShell's errorBanner slot), not as inline body content,
  // so it shouldn't force the composer itself into column layout.
  const isInlinePanelOpen = voice.isRecording || enhance.isEnhanceOpen;
  const isColumnLayout = isFocused || hasContent || showAttachments || isInlinePanelOpen;

  return { canSubmit, canOpenEnhance, isColumnLayout };
}
