import { useRouter } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { ComposerSendButton } from '~/components/composer/ComposerSendButton';
import { useAppTheme, useStyles } from '~/components/theme';
import { IconButton } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import { setActiveEnhanceSession } from '~/services/ai/active-enhance-session';
import t from '~/translations';

import type { ComposerProps, ComposerSubmitKind } from './composer.types';
import { ComposerAttachButton } from './ComposerAttachButton';
import {
  deriveComposerContentCapabilities,
  type ComposerCapabilitiesVoiceInput,
} from './composerCapabilities.helpers';
import type { ComposerEntryKind } from './composerInference';
import { inferComposerEntryKind } from './composerInference';
import { ComposerKindToggle } from './ComposerKindToggle';
import { getComposerSubmissionConfig } from './composerSubmission.helpers';
import type { ComposerMessageStore } from './useComposerMessageStore';
import { useComposerMessageStore } from './useComposerMessageStore';

interface ComposerToolbarProps {
  composerProps: ComposerProps;
  messageStore: ComposerMessageStore;
  entryMode: 'mixed' | ComposerEntryKind;
  manualEntryKind: ComposerEntryKind | null;
  onManualEntryKindChange: (kind: ComposerEntryKind) => void;
  uploadedAttachmentCount: number;
  state: {
    isFocused: boolean;
    isInteractionBusy: boolean;
    isSubmitting: boolean;
    showAttachments: boolean;
  };
  capabilities: { canPickMedia: boolean; canToggleVoice: boolean };
  voice: {
    isBusy: boolean;
    isRecording: boolean;
    isCleaningVoice: boolean;
    isRecordingElsewhere: boolean;
    isWalkieTalkie: boolean;
    handleVoicePress: () => void | Promise<void>;
  };
  onChangeMessage: (message: string) => void;
  onToggleWalkieTalkie: (() => void) | undefined;
  onSubmit: (kind: ComposerSubmitKind, message: string, canSubmit: boolean) => void;
}

// The action row (attach, entry-kind toggle, enhance/walkie-talkie/mic/send)
// subscribes to the message store separately from ComposerInput, so typing
// re-renders each independently instead of the whole composer (see
// useComposerMessageStore.ts).
function ComposerToolbarComponent({
  composerProps,
  messageStore,
  entryMode,
  manualEntryKind,
  onManualEntryKindChange,
  uploadedAttachmentCount,
  state,
  capabilities,
  voice,
  onChangeMessage,
  onToggleWalkieTalkie,
  onSubmit,
}: ComposerToolbarProps) {
  const router = useRouter();
  const inferredEntryKind = useComposerMessageStore(messageStore, inferComposerEntryKind);
  const selectedEntryKind =
    manualEntryKind ?? (entryMode === 'mixed' ? inferredEntryKind : entryMode);
  const hasContent =
    useComposerMessageStore(messageStore, (value) => value.trim().length > 0) ||
    uploadedAttachmentCount > 0;
  const { primary } = useAppTheme().colors;
  const styles = useStyles((theme) => ({
    trailingActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.card,
      paddingVertical: 4,
    },
    leadingActions: { flexDirection: 'row', alignItems: 'center' },
  }));

  const voiceCapabilitiesInput: ComposerCapabilitiesVoiceInput = {
    isBusy: voice.isBusy,
    isRecording: voice.isRecording,
    isCleaningVoice: voice.isCleaningVoice,
    isRecordingElsewhere: voice.isRecordingElsewhere,
  };
  const { canSubmit, canOpenEnhance } = deriveComposerContentCapabilities({
    hasContent,
    isFocused: state.isFocused,
    showAttachments: state.showAttachments,
    isInteractionBusy: state.isInteractionBusy,
    voice: voiceCapabilitiesInput,
  });

  const presentation = getComposerSubmissionConfig(composerProps, selectedEntryKind);
  const kindControl =
    composerProps.mode === 'inbox' && composerProps.entryMode === 'mixed' ? (
      <ComposerKindToggle onSelect={onManualEntryKindChange} selected={selectedEntryKind} />
    ) : null;

  const openEnhance = () => {
    setActiveEnhanceSession({ getMessage: messageStore.getMessage, setMessage: onChangeMessage });
    router.push('/enhance-sheet');
  };

  return (
    <View style={styles.toolbar}>
      <View style={styles.leadingActions}>
        <ComposerAttachButton disabled={!capabilities.canPickMedia} />
      </View>
      <View style={styles.trailingActions}>
        {kindControl}
        {hasContent ? (
          <IconButton
            accessibilityLabel={t.inboxComposer.composer.enhanceTextA11y}
            disabled={!canOpenEnhance}
            variant="plain"
            onPress={openEnhance}
          >
            <AppIcon name="wand.and.sparkles" size={20} />
          </IconButton>
        ) : null}
        {onToggleWalkieTalkie ? (
          <IconButton
            accessibilityLabel={
              voice.isWalkieTalkie
                ? t.inboxComposer.composer.disableWalkieTalkieA11y
                : t.inboxComposer.composer.enableWalkieTalkieA11y
            }
            testID="composer-walkie-talkie-toggle"
            variant="plain"
            onPress={onToggleWalkieTalkie}
          >
            <AppIcon
              name="antenna.radiowaves.left.and.right"
              size={20}
              tintColor={voice.isWalkieTalkie ? primary : undefined}
            />
          </IconButton>
        ) : null}
        <IconButton
          accessibilityLabel={
            voice.isRecordingElsewhere
              ? t.inboxComposer.composer.recordingElsewhereA11y
              : t.inboxComposer.composer.startVoiceInputA11y
          }
          disabled={!capabilities.canToggleVoice}
          testID="composer-mic-button"
          variant="plain"
          onPress={() => void voice.handleVoicePress()}
        >
          <AppIcon name="mic.fill" size={20} />
        </IconButton>
        <ComposerSendButton
          accessibilityLabel={
            presentation.submitAccessibilityLabel ??
            (state.isSubmitting ? t.chat.input.sendingA11y : t.chat.input.sendMessageA11y)
          }
          disabled={!canSubmit}
          icon="arrow.up"
          testID={presentation.submitTestID}
          onPress={() =>
            onSubmit(presentation.primarySubmitKind, messageStore.getMessage(), canSubmit)
          }
        />
      </View>
    </View>
  );
}

export const ComposerToolbar = memo(ComposerToolbarComponent);
