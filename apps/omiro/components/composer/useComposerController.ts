import { useCallback, useMemo, useState } from 'react';

import { deriveComposerCapabilities } from '~/components/composer/composerCapabilities.helpers';
import { useComposerAttachments } from '~/components/composer/ComposerContext';
import { useComposerDraft } from '~/components/composer/useComposerDraft';
import { useVoiceComposerInput } from '~/components/composer/useVoiceComposerInput';
import { useInlineEnhance } from '~/services/ai';

import type { ComposerEntryKind } from './composer.types';
import { inferComposerEntryKind } from './composerInference';

interface UseComposerControllerOptions {
  initialMessage?: string;
  isSubmitting?: boolean;
  onDraftChange?: (message: string) => void;
  onClearDraft?: () => void;
  onWalkieTalkieTranscript?: (rawText: string) => void;
  entryMode?: 'mixed' | ComposerEntryKind;
}

// Composes the composer's independent concerns — draft text, attachments,
// voice input, inline enhance, and focus — into the single set of derived
// capabilities and handlers that Composer.tsx renders from. Submission itself
// (what happens on save/send) lives in useComposerSubmission, not here.
export function useComposerController({
  initialMessage,
  isSubmitting = false,
  onDraftChange,
  onClearDraft,
  onWalkieTalkieTranscript,
  entryMode = 'mixed',
}: UseComposerControllerOptions) {
  const draft = useComposerDraft({ initialMessage, onDraftChange });
  const { attachments, errors, isUploading, clearAttachments, markAttachmentsSubmitted } =
    useComposerAttachments();
  const uploadedAttachmentIds = useMemo(
    () =>
      attachments.flatMap((attachment) =>
        attachment.uploadedFile?.id ? [attachment.uploadedFile.id] : [],
      ),
    [attachments],
  );
  const hasContent = draft.message.trim().length > 0 || uploadedAttachmentIds.length > 0;
  const [manualEntryKind, setManualEntryKind] = useState<ComposerEntryKind | null>(
    entryMode === 'mixed' ? null : entryMode,
  );
  const inferredEntryKind = inferComposerEntryKind(draft.message);
  const selectedEntryKind =
    manualEntryKind ?? (entryMode === 'mixed' ? inferredEntryKind : entryMode);

  const voice = useVoiceComposerInput({
    getMessage: draft.getMessage,
    setMessage: draft.setMessage,
    onWalkieTalkieSend: onWalkieTalkieTranscript,
  });
  const enhance = useInlineEnhance();

  const showAttachments = attachments.length > 0 || errors.length > 0 || isUploading;

  const [isFocused, setIsFocused] = useState(false);
  const handleInputFocus = useCallback(() => setIsFocused(true), []);
  const handleInputBlur = useCallback(() => setIsFocused(false), []);

  const { canSubmit, canOpenEnhance, canPickMedia, canToggleVoice, isColumnLayout } =
    deriveComposerCapabilities({
      hasContent,
      isSubmitting,
      isUploading,
      isFocused,
      showAttachments,
      voice: {
        isBusy: voice.isBusy,
        isRecording: voice.isRecording,
        isCleaningVoice: voice.isCleaningVoice,
        isRecordingElsewhere: voice.isRecordingElsewhere,
      },
      enhance: {
        isEnhancing: enhance.isEnhancing,
        isEnhanceOpen: enhance.isEnhanceOpen,
      },
    });

  const clearComposer = useCallback(() => {
    draft.clearDraft();
    clearAttachments();
    enhance.closeEnhance();
    onClearDraft?.();
    setManualEntryKind(entryMode === 'mixed' ? null : entryMode);
  }, [clearAttachments, draft.clearDraft, enhance.closeEnhance, entryMode, onClearDraft]);

  return useMemo(
    () => ({
      hasContent,
      isFocused,
      message: draft.message,
      setMessage: draft.setMessage,
      showAttachments,
      uploadedAttachmentIds,
      canSubmit,
      canOpenEnhance,
      canPickMedia,
      canToggleVoice,
      handleInputFocus,
      handleInputBlur,
      isColumnLayout,
      voice,
      enhance,
      clearComposer,
      inferredEntryKind,
      manualEntryKind,
      selectedEntryKind,
      setManualEntryKind,
      markAttachmentsSubmitted,
    }),
    [
      draft.message,
      hasContent,
      isFocused,
      draft.setMessage,
      showAttachments,
      uploadedAttachmentIds,
      canSubmit,
      canOpenEnhance,
      canPickMedia,
      canToggleVoice,
      handleInputFocus,
      handleInputBlur,
      isColumnLayout,
      voice,
      enhance,
      clearComposer,
      inferredEntryKind,
      manualEntryKind,
      selectedEntryKind,
      markAttachmentsSubmitted,
    ],
  );
}
