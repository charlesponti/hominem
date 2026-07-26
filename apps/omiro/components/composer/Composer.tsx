import React, { useCallback, useRef } from 'react';
import { TextInput } from 'react-native';

import { InlineEnhancePanel } from '~/components/ai/InlineEnhancePanel';
import { InlineErrorBanner } from '~/components/ui/InlineErrorBanner';
import { VoiceRecordingPanel } from '~/components/voice/VoiceRecordingPanel';

import type { ComposerProps, ComposerSubmitKind } from './composer.types';
import { ComposerAttachmentRow } from './ComposerAttachmentRow';
import { ComposerProvider } from './ComposerContext';
import { ComposerShell } from './ComposerShell';
import { getComposerSubmissionConfig } from './composerSubmission.helpers';
import { ComposerTextInput } from './ComposerTextInput';
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
  const submission = useComposerSubmission(props);
  const inputRef = useRef<TextInput>(null);
  const controller = useComposerController({
    initialMessage: submission.initialMessage,
    isSubmitting: submission.isSubmitting,
    onDraftChange: submission.onDraftChange,
    onClearDraft: submission.onClearDraft,
  });
  const presentation = getComposerSubmissionConfig(props);

  const submit = useCallback(
    (kind: ComposerSubmitKind) => {
      // Marked before the async submission starts so this provider unmounting
      // mid-flight (e.g. navigating to the newly created chat) can't race the
      // cleanup effect into deleting files that were just handed off.
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

  const isInbox = props.mode === 'inbox';
  const secondaryActionConfig = presentation.secondaryAction;
  const secondaryAction = secondaryActionConfig
    ? {
        accessibilityLabel: secondaryActionConfig.accessibilityLabel,
        icon: secondaryActionConfig.icon,
        onPress: () => submit(secondaryActionConfig.kind),
        testID: secondaryActionConfig.testID,
      }
    : undefined;

  return (
    <ComposerShell
      testID={presentation.shellTestID}
      isRecording={controller.voice.isRecording}
      isColumnLayout={controller.isColumnLayout}
      accessory={controller.showAttachments ? <ComposerAttachmentRow /> : undefined}
      inlinePanel={
        controller.voice.isRecording ? (
          <VoiceRecordingPanel
            startedAt={controller.voice.recordingStartedAt}
            onCancel={() => void controller.voice.cancelVoiceRecording()}
            onDone={() => void controller.voice.handleVoicePress()}
          />
        ) : (
          <InlineEnhancePanel
            enhance={controller.enhance}
            text={controller.message}
            onEnhanced={controller.setMessage}
          />
        )
      }
      errorBanner={
        controller.voice.voiceState === 'failed' && controller.voice.error ? (
          <InlineErrorBanner
            message={getVoiceComposerErrorPresentation(controller.voice.error.code).message}
            onDismiss={controller.voice.clearError}
          />
        ) : undefined
      }
      input={
        <ComposerTextInput
          inputRef={inputRef}
          value={controller.message}
          onChangeText={controller.setMessage}
          placeholder={presentation.placeholder}
          testID={presentation.inputTestID}
          isColumnLayout={controller.isColumnLayout}
          onFocus={controller.handleInputFocus}
          onBlur={controller.handleInputBlur}
        />
      }
      toolbar={
        <ComposerToolbar
          isInbox={isInbox}
          isRecording={controller.voice.isRecording}
          isRecordingElsewhere={controller.voice.isRecordingElsewhere}
          isVoiceBusy={controller.voice.isBusy}
          isEnhancing={controller.enhance.isEnhancing}
          isCleaningVoice={controller.voice.isCleaningVoice}
          canPickMedia={controller.canPickMedia}
          canToggleVoice={controller.canToggleVoice}
          canEnhance={controller.canOpenEnhance}
          canSubmit={controller.canSubmit}
          isSubmitting={submission.isSubmitting}
          onVoicePress={() => void controller.voice.handleVoicePress()}
          onEnhancePress={controller.enhance.toggleEnhance}
          onSubmit={() => submit(presentation.primarySubmitKind)}
          submitTestID={presentation.submitTestID}
          submitAccessibilityLabel={presentation.submitAccessibilityLabel}
          secondaryAction={secondaryAction}
        />
      }
    />
  );
}
