interface ComposerCapabilitiesVoiceInput {
  isBusy: boolean;
  isRecording: boolean;
  isCleaningVoice: boolean;
  isRecordingElsewhere: boolean;
}

interface ComposerCapabilitiesEnhanceInput {
  isEnhancing: boolean;
  isEnhanceOpen: boolean;
}

export interface ComposerCapabilitiesInput {
  hasContent: boolean;
  isSubmitting: boolean;
  isUploading: boolean;
  isFocused: boolean;
  showAttachments: boolean;
  voice: ComposerCapabilitiesVoiceInput;
  enhance: ComposerCapabilitiesEnhanceInput;
}

export interface ComposerCapabilities {
  canSubmit: boolean;
  canOpenEnhance: boolean;
  canPickMedia: boolean;
  canToggleVoice: boolean;
  isColumnLayout: boolean;
}

export function deriveComposerCapabilities({
  hasContent,
  isSubmitting,
  isUploading,
  isFocused,
  showAttachments,
  voice,
  enhance,
}: ComposerCapabilitiesInput): ComposerCapabilities {
  const isInteractionBusy = isSubmitting || isUploading || voice.isBusy || enhance.isEnhancing;
  const canSubmit = hasContent && !isInteractionBusy;
  const canOpenEnhance = hasContent && !isInteractionBusy && !voice.isCleaningVoice;
  const canPickMedia = !isInteractionBusy;
  const canToggleVoice =
    voice.isRecording ||
    (!isInteractionBusy && !voice.isCleaningVoice && !voice.isRecordingElsewhere);

  // The transcription-failed error no longer counts here — it renders as a popover
  // above the composer (ComposerShell's errorBanner slot), not as inline body content,
  // so it shouldn't force the composer itself into column layout.
  const isInlinePanelOpen = voice.isRecording || enhance.isEnhanceOpen;
  const isColumnLayout = isFocused || hasContent || showAttachments || isInlinePanelOpen;

  return { canSubmit, canOpenEnhance, canPickMedia, canToggleVoice, isColumnLayout };
}
