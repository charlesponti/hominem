import { useCallback } from 'react';
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
  const controller = useComposerController({
    initialMessage: submission.initialMessage,
    isSubmitting: submission.isSubmitting,
    onDraftChange: submission.onDraftChange,
    onClearDraft: submission.onClearDraft,
  });
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
      {!isRecording ? (
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
        {isRecording ? (
          <VoiceRecordingPanel
            startedAt={controller.voice.recordingStartedAt}
            onCancel={() => void controller.voice.cancelVoiceRecording()}
            onDone={() => void controller.voice.handleVoicePress()}
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
        {isRecording ? null : (
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
            onEnhancePress={controller.enhance.toggleEnhance}
            onSubmit={() => submit(presentation.primarySubmitKind)}
            onVoicePress={() => void controller.voice.handleVoicePress()}
            submitAccessibilityLabel={presentation.submitAccessibilityLabel}
            submitTestID={presentation.submitTestID}
          />
        )}
      </View>
    </View>
  );
}
