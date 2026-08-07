import { Card, nativeShadows, TextField } from '@ponti-studios/ui/native';
import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { InlineEnhancePanel } from '~/components/ai/InlineEnhancePanel';
import { InlineErrorBanner } from '~/components/ui/InlineErrorBanner';
import { VoiceRecordingPanel } from '~/components/voice/VoiceRecordingPanel';

import type { ComposerProps, ComposerSubmitKind } from './composer.types';
import { ComposerAttachButton } from './ComposerAttachButton';
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
  const submission = useComposerSubmission(props);
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

  const [primary, destructive, borderDefault] = useCSSVariable([
    '--color-primary',
    '--color-destructive',
    '--color-border',
  ]) as string[];

  const isRecording = controller.voice.isRecording;
  const isWalkieTalkieSending =
    controller.voice.isWalkieTalkie && !isRecording && submission.isSubmitting;
  const showVoicePanel = isRecording || isWalkieTalkieSending;
  const focused = controller.isFocused;
  const borderColor = focused ? primary : isRecording ? destructive : borderDefault;

  const errorBanner =
    controller.voice.voiceState === 'failed' && controller.voice.error ? (
      <InlineErrorBanner
        message={getVoiceComposerErrorPresentation(controller.voice.error.code).message}
        onDismiss={controller.voice.clearError}
      />
    ) : undefined;

  return (
    <View className="w-full gap-3" testID={presentation.shellTestID}>
      {errorBanner}
      {controller.showAttachments ? <ComposerAttachmentRow /> : undefined}
      {!showVoicePanel ? (
        <InlineEnhancePanel
          enhance={controller.enhance}
          text={controller.message}
          onEnhanced={controller.setMessage}
        />
      ) : undefined}
      {showVoicePanel ? (
        <VoiceRecordingPanel
          startedAt={controller.voice.recordingStartedAt}
          onCancel={() => void controller.voice.cancelVoiceRecording()}
          onDone={() => void controller.voice.handleVoicePress()}
          phase={isRecording ? 'recording' : 'sending'}
        />
      ) : (
        <Card
          className="w-full gap-2 p-3"
          style={{
            borderColor,
            borderCurve: 'continuous',
            borderRadius: 24,
            boxShadow: nativeShadows.sm,
          }}
          testID={`${presentation.shellTestID ?? 'composer'}-surface`}
        >
          <TextField
            value={controller.message}
            onChangeText={controller.setMessage}
            placeholder={presentation.placeholder}
            testID={presentation.inputTestID}
            onFocus={controller.handleInputFocus}
            onBlur={controller.handleInputBlur}
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
            <ComposerAttachButton disabled={!controller.canPickMedia} />
            <ComposerToolbar
              canEnhance={controller.canOpenEnhance}
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
          </View>
        </Card>
      )}
    </View>
  );
}
