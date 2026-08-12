import { useCallback, useMemo, useState } from 'react';

import { deriveComposerBusyCapabilities } from '~/components/composer/composerCapabilities.helpers';
import { useComposerAttachments } from '~/components/composer/ComposerContext';
import { useComposerDraft } from '~/components/composer/useComposerDraft';
import { useVoiceComposerInput } from '~/components/composer/useVoiceComposerInput';
import { useInlineEnhance } from '~/services/ai';

import type { ComposerEntryKind } from './composer.types';

interface UseComposerControllerOptions {
  initialMessage?: string;
  isSubmitting?: boolean;
  onDraftChange?: (message: string) => void;
  onClearDraft?: () => void;
  onWalkieTalkieTranscript?: (rawText: string) => void;
  entryMode?: 'mixed' | ComposerEntryKind;
}

// Composes the composer's independent concerns -- draft text, attachments,
// voice input, inline enhance, and focus -- into the derived capabilities and
// handlers Composer.tsx renders from. Submission itself (what happens on
// save/send) lives in useComposerSubmission, not here.
//
// Deliberately does NOT read the draft message reactively: draft.store is an
// external store (see useComposerMessageStore.ts), and only the leaf
// component that actually needs per-keystroke text (ComposerActiveArea)
// subscribes to it. Reading draft.getMessage()'s value here via React state
// would re-render every consumer of this hook -- the whole composer -- on
// every keystroke.
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
  const [manualEntryKind, setManualEntryKind] = useState<ComposerEntryKind | null>(
    entryMode === 'mixed' ? null : entryMode,
  );

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

  const { canPickMedia, canToggleVoice, isInteractionBusy } = deriveComposerBusyCapabilities({
    isSubmitting,
    isUploading,
    voice: {
      isBusy: voice.isBusy,
      isRecording: voice.isRecording,
      isCleaningVoice: voice.isCleaningVoice,
      isRecordingElsewhere: voice.isRecordingElsewhere,
    },
    enhance: { isEnhancing: enhance.isEnhancing },
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
      messageStore: draft.store,
      getMessage: draft.getMessage,
      setMessage: draft.setMessage,
      isFocused,
      showAttachments,
      uploadedAttachmentIds,
      canPickMedia,
      canToggleVoice,
      isInteractionBusy,
      handleInputFocus,
      handleInputBlur,
      voice,
      enhance,
      clearComposer,
      entryMode,
      manualEntryKind,
      setManualEntryKind,
      markAttachmentsSubmitted,
    }),
    [
      draft.store,
      draft.getMessage,
      draft.setMessage,
      isFocused,
      showAttachments,
      uploadedAttachmentIds,
      canPickMedia,
      canToggleVoice,
      isInteractionBusy,
      handleInputFocus,
      handleInputBlur,
      voice,
      enhance,
      clearComposer,
      entryMode,
      manualEntryKind,
      markAttachmentsSubmitted,
    ],
  );
}
