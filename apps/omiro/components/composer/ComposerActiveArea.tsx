import { TextField } from '@ponti-studios/ui/native';
import { memo } from 'react';
import { View } from 'react-native';

import type { ComposerProps, ComposerSubmitKind } from './composer.types';
import { ComposerAttachButton } from './ComposerAttachButton';
import {
  deriveComposerContentCapabilities,
  type ComposerCapabilitiesEnhanceInput,
  type ComposerCapabilitiesVoiceInput,
} from './composerCapabilities.helpers';
import { inferComposerEntryKind, type ComposerEntryKind } from './composerInference';
import { ComposerKindToggle } from './ComposerKindToggle';
import { getComposerSubmissionConfig } from './composerSubmission.helpers';
import { ComposerToolbar } from './ComposerToolbar';
import { useComposerMessageSelector } from './useComposerMessageStore';
import type { ComposerMessageStore } from './useComposerMessageStore';

interface ComposerActiveAreaProps {
  composerProps: ComposerProps;
  messageStore: ComposerMessageStore;
  entryMode: 'mixed' | ComposerEntryKind;
  manualEntryKind: ComposerEntryKind | null;
  onManualEntryKindChange: (kind: ComposerEntryKind) => void;
  uploadedAttachmentCount: number;
  isFocused: boolean;
  showAttachments: boolean;
  isInteractionBusy: boolean;
  isSubmitting: boolean;
  canPickMedia: boolean;
  canToggleVoice: boolean;
  voice: {
    isBusy: boolean;
    isRecording: boolean;
    isCleaningVoice: boolean;
    isRecordingElsewhere: boolean;
    isWalkieTalkie: boolean;
    handleVoicePress: () => void | Promise<void>;
    setWalkieTalkie: (updater: (prev: boolean) => boolean) => void;
  };
  enhance: ComposerCapabilitiesEnhanceInput & { toggleEnhance: () => void };
  onToggleWalkieTalkie: (() => void) | undefined;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: (kind: ComposerSubmitKind, message: string, canSubmit: boolean) => void;
  // Wraps messageStore.setMessage with the draft-persistence side effect
  // (writeChatDraft / inbox onDraftChange) -- must be used for the TextField's
  // onChangeText instead of calling messageStore.setMessage directly.
  onChangeMessage: (message: string) => void;
}

// The only part of the composer that subscribes to the message store (see
// useComposerMessageStore.ts) -- typing re-renders this component alone, not
// Composer.tsx and everything else it renders (attachment row, enhance tray,
// voice panel, error banner). See ComposerToolbar/ComposerKindToggle for the
// pieces this assembles.
function ComposerActiveAreaComponent({
  composerProps,
  messageStore,
  entryMode,
  manualEntryKind,
  onManualEntryKindChange,
  uploadedAttachmentCount,
  isFocused,
  showAttachments,
  isInteractionBusy,
  isSubmitting,
  canPickMedia,
  canToggleVoice,
  voice,
  enhance,
  onToggleWalkieTalkie,
  onFocus,
  onBlur,
  onSubmit,
  onChangeMessage,
}: ComposerActiveAreaProps) {
  const message = useComposerMessageSelector(messageStore, (value) => value);
  const inferredEntryKind = useComposerMessageSelector(messageStore, inferComposerEntryKind);
  const selectedEntryKind =
    manualEntryKind ?? (entryMode === 'mixed' ? inferredEntryKind : entryMode);
  const hasContent =
    useComposerMessageSelector(messageStore, (value) => value.trim().length > 0) ||
    uploadedAttachmentCount > 0;

  const voiceCapabilitiesInput: ComposerCapabilitiesVoiceInput = {
    isBusy: voice.isBusy,
    isRecording: voice.isRecording,
    isCleaningVoice: voice.isCleaningVoice,
    isRecordingElsewhere: voice.isRecordingElsewhere,
  };
  const { canSubmit, canOpenEnhance } = deriveComposerContentCapabilities({
    hasContent,
    isFocused,
    showAttachments,
    isInteractionBusy,
    voice: voiceCapabilitiesInput,
    enhance,
  });

  const presentation = getComposerSubmissionConfig(composerProps, selectedEntryKind);
  const kindControl =
    composerProps.mode === 'inbox' && composerProps.entryMode === 'mixed' ? (
      <ComposerKindToggle onSelect={onManualEntryKindChange} selected={selectedEntryKind} />
    ) : null;

  return (
    <View className="gap-2">
      <TextField
        value={message}
        onChangeText={onChangeMessage}
        placeholder={presentation.placeholder}
        testID={presentation.inputTestID}
        onFocus={onFocus}
        onBlur={onBlur}
        multiline
        numberOfLines={5}
        style={{
          borderRadius: 0,
          borderWidth: 0,
          minHeight: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
        }}
      />
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <ComposerAttachButton disabled={!canPickMedia} />
        </View>
        {kindControl}
        <ComposerToolbar
          canEnhance={canOpenEnhance}
          canSubmit={canSubmit}
          canToggleVoice={canToggleVoice}
          hasContent={hasContent}
          isEnhancing={enhance.isEnhancing}
          isRecordingElsewhere={voice.isRecordingElsewhere}
          isSubmitting={isSubmitting}
          isVoiceBusy={voice.isBusy}
          isWalkieTalkie={voice.isWalkieTalkie}
          onEnhancePress={enhance.toggleEnhance}
          onSubmit={() =>
            onSubmit(presentation.primarySubmitKind, messageStore.getMessage(), canSubmit)
          }
          onVoicePress={() => void voice.handleVoicePress()}
          onToggleWalkieTalkie={onToggleWalkieTalkie}
          submitAccessibilityLabel={presentation.submitAccessibilityLabel}
          submitTestID={presentation.submitTestID}
        />
      </View>
    </View>
  );
}

export const ComposerActiveArea = memo(ComposerActiveAreaComponent);
