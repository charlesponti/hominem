import React, { useCallback } from 'react';

import { InlineEnhancePanel } from '~/components/ai/InlineEnhancePanel';
import { InlineErrorBanner } from '~/components/ui/InlineErrorBanner';
import { VoiceRecordingPanel } from '~/components/voice/VoiceRecordingPanel';

import type { ComposerProps, ComposerSubmitKind } from './composer.types';
import { ComposerAttachmentRow } from './ComposerAttachmentRow';
import { ComposerProvider } from './ComposerContext';
import { ComposerShell } from './ComposerShell';
import { ComposerTextField } from './ComposerTextField';
import { getComposerSubmissionConfig } from './composerSubmission.helpers';
import {
  ComposerToolbar,
} from './ComposerToolbar';
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
      focused={controller.isFocused}
      isRecording={controller.voice.isRecording}
      accessory={controller.showAttachments ? <ComposerAttachmentRow /> : undefined}
      inlinePanel={
        !controller.voice.isRecording ? (
          <InlineEnhancePanel
            enhance={controller.enhance}
            text={controller.message}
            onEnhanced={controller.setMessage}
          />
        ) : undefined
      }
      recordingPanel={
        <VoiceRecordingPanel
          startedAt={controller.voice.recordingStartedAt}
          onCancel={() => void controller.voice.cancelVoiceRecording()}
          onDone={() => void controller.voice.handleVoicePress()}
        />
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
        <ComposerTextField
          value={controller.message}
          onChangeText={controller.setMessage}
          placeholder={presentation.placeholder}
          testID={presentation.inputTestID}
          onFocus={controller.handleInputFocus}
          onBlur={controller.handleInputBlur}
        />
      }
      actions={
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
          secondaryAction={secondaryAction}
          submitAccessibilityLabel={presentation.submitAccessibilityLabel}
          submitTestID={presentation.submitTestID}
        />
      }
    />
  );
}
