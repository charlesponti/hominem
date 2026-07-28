import { useCallback, useRef } from 'react';
import { View } from 'react-native';

import { InlineEnhancePanel } from '~/components/ai/InlineEnhancePanel';
import { useTheme } from '~/components/theme';
import { InlineErrorBanner } from '~/components/ui/InlineErrorBanner';
import { TextField } from '~/components/ui/text-field';
import { VoiceRecordingPanel } from '~/components/voice/VoiceRecordingPanel';

import { useComposerRootStyles, useComposerSurfaceStyles } from './composer.styles';
import type { ComposerProps, ComposerSubmitKind } from './composer.types';
import { ComposerAttachmentRow } from './ComposerAttachmentRow';
import { ComposerProvider } from './ComposerContext';
import { getComposerSubmissionConfig } from './composerSubmission.helpers';
import { ComposerToolbar } from './ComposerToolbar';
import { useComposerController } from './useComposerController';
import { useComposerSubmission } from './useComposerSubmission';
import { getVoiceComposerErrorPresentation } from './voiceComposerInput.helpers';

export type { ComposerProps } from './composer.types';

export function Composer(props: ComposerProps) {
  return (
    <ComposerProvider key={props.mode === 'chat' ? props.chatId : 'inbox-composer'}>
      <ComposerContent {...props} />
    </ComposerProvider>
  );
}

function ComposerContent(props: ComposerProps) {
  const theme = useTheme();
  const submission = useComposerSubmission(props);
  // useVoiceComposerInput's onWalkieTalkieSend fires from processStoppedRecording,
  // which is defined before submission.submit's caller (controller) exists —
  // route through a ref rather than restructuring the hook order, mirroring
  // the onRecordingStoppedRef pattern already used in useVoiceRecorder.ts.
  const clearComposerRef = useRef<() => void>(() => {});
  const handleWalkieTalkieTranscript = useCallback(
    (rawText: string) => {
      if (!rawText.trim()) return;
      void submission.submit(
        {
          canSubmit: true,
          clearComposer: () => clearComposerRef.current(),
          fileIds: [],
          message: rawText,
          responseModality: 'audio',
        },
        'message',
      );
    },
    [submission],
  );
  const controller = useComposerController({
    initialMessage: submission.initialMessage,
    isSubmitting: submission.isSubmitting,
    onDraftChange: submission.onDraftChange,
    onClearDraft: submission.onClearDraft,
    onWalkieTalkieTranscript: props.mode === 'chat' ? handleWalkieTalkieTranscript : undefined,
  });
  clearComposerRef.current = controller.clearComposer;
  const presentation = getComposerSubmissionConfig(props);
  const rootStyles = useComposerRootStyles();
  const surfaceStyles = useComposerSurfaceStyles();

  const submit = useCallback(
    (kind: ComposerSubmitKind) => {
      if (controller.canSubmit) {
        controller.markAttachmentsSubmitted(controller.uploadedAttachmentIds);
      }
      void submission.submit(
        {
          canSubmit: controller.canSubmit,
          clearComposer: controller.clearComposer,
          fileIds: controller.uploadedAttachmentIds,
          message: controller.message,
        },
        kind,
      );
    },
    [controller, submission],
  );

  const isRecording = controller.voice.isRecording;
  // Bridges the gap between a walkie-talkie auto-send (recording already
  // stopped) and the reply arriving — without this the panel would flash back
  // to the idle TextField mid-send, since isRecording flips false immediately
  // once stopRecording resolves, before the send has even started.
  const isWalkieTalkieSending =
    controller.voice.isWalkieTalkie && !isRecording && submission.isSubmitting;
  const showVoicePanel = isRecording || isWalkieTalkieSending;
  const focused = controller.isFocused;
  const borderColor = focused
    ? theme.colors.primary
    : isRecording
      ? theme.colors.destructive
      : theme.colors['border-default'];

  const errorBanner =
    controller.voice.voiceState === 'failed' && controller.voice.error ? (
      <InlineErrorBanner
        message={getVoiceComposerErrorPresentation(controller.voice.error.code).message}
        onDismiss={controller.voice.clearError}
      />
    ) : undefined;

  return (
    <View style={rootStyles.root} testID={presentation.shellTestID}>
      {errorBanner}
      {controller.showAttachments ? <ComposerAttachmentRow /> : undefined}
      {!showVoicePanel ? (
        <InlineEnhancePanel
          enhance={controller.enhance}
          text={controller.message}
          onEnhanced={controller.setMessage}
        />
      ) : undefined}
      <View
        style={[surfaceStyles.surface, { borderColor }]}
        testID={`${presentation.shellTestID ?? 'composer'}-surface`}
      >
        {showVoicePanel ? (
          <VoiceRecordingPanel
            startedAt={controller.voice.recordingStartedAt}
            onCancel={() => void controller.voice.cancelVoiceRecording()}
            onDone={() => void controller.voice.handleVoicePress()}
            phase={isRecording ? 'recording' : 'sending'}
          />
        ) : (
          <TextField
            value={controller.message}
            onChangeText={controller.setMessage}
            placeholder={presentation.placeholder}
            testID={presentation.inputTestID}
            onFocus={controller.handleInputFocus}
            onBlur={controller.handleInputBlur}
            multiline
            numberOfLines={5}
            style={surfaceStyles.input}
          />
        )}
        {showVoicePanel ? null : (
          <ComposerToolbar
            canEnhance={controller.canOpenEnhance}
            canPickMedia={controller.canPickMedia}
            canSubmit={controller.canSubmit}
            canToggleVoice={controller.canToggleVoice}
            hasContent={controller.hasContent}
            isEnhancing={controller.enhance.isEnhancing}
            isRecordingElsewhere={controller.voice.isRecordingElsewhere}
            isSubmitting={submission.isSubmitting}
            isVoiceBusy={controller.voice.isBusy}
            isWalkieTalkie={controller.voice.isWalkieTalkie}
            onEnhancePress={controller.enhance.toggleEnhance}
            onSubmit={() => submit(presentation.primarySubmitKind)}
            onVoicePress={() => void controller.voice.handleVoicePress()}
            onToggleWalkieTalkie={
              props.mode === 'chat'
                ? () => controller.voice.setWalkieTalkie((prev) => !prev)
                : undefined
            }
            submitAccessibilityLabel={presentation.submitAccessibilityLabel}
            submitTestID={presentation.submitTestID}
          />
        )}
      </View>
    </View>
  );
}
