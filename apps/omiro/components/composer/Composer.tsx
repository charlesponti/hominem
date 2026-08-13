import { Card, nativeShadows } from '@ponti-studios/ui/native';
import { transitionDurations } from '@ponti-studios/ui/tokens';
import { useCallback, useRef } from 'react';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { InlineEnhanceTray } from '~/components/ai/InlineEnhanceTray';
import { InlineErrorBanner } from '~/components/ui/InlineErrorBanner';
import { VoiceRecordingPanel } from '~/components/voice/VoiceRecordingPanel';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

import type { ComposerProps, ComposerSubmitKind } from './composer.types';
import { ComposerActiveArea } from './ComposerActiveArea';
import { ComposerAttachmentRow } from './ComposerAttachmentRow';
import { ComposerProvider } from './ComposerContext';
import { getComposerSubmissionConfig } from './composerSubmission.helpers';
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
  const setMessageRef = useRef<(message: string) => void>(() => {});
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
          restoreDraft: setMessageRef.current,
        },
        'message',
      );
    },
    [submission],
  );
  const controller = useComposerController({
    entryMode: props.mode === 'inbox' ? props.entryMode : undefined,
    initialMessage: submission.initialMessage,
    isSubmitting: submission.isSubmitting,
    onDraftChange: submission.onDraftChange,
    onClearDraft: submission.onClearDraft,
    onWalkieTalkieTranscript: props.mode === 'chat' ? handleWalkieTalkieTranscript : undefined,
  });
  clearComposerRef.current = controller.clearComposer;
  setMessageRef.current = controller.setMessage;
  // Static (mode-only) fields for the outer shell -- the kind-dependent
  // fields (placeholder, submitTestID, ...) are recomputed inside
  // ComposerActiveArea, which is the only thing that knows the live,
  // possibly-inferred entry kind without subscribing to the message store here.
  const presentation = getComposerSubmissionConfig(props);

  const handleActiveAreaSubmit = useCallback(
    (kind: ComposerSubmitKind, message: string, canSubmit: boolean) => {
      if (canSubmit) {
        controller.markAttachmentsSubmitted(controller.uploadedAttachmentIds);
      }
      void submission.submit(
        {
          canSubmit,
          clearComposer: controller.clearComposer,
          fileIds: controller.uploadedAttachmentIds,
          message,
          restoreDraft: controller.setMessage,
        },
        kind,
      );
    },
    [
      controller.clearComposer,
      controller.markAttachmentsSubmitted,
      controller.setMessage,
      controller.uploadedAttachmentIds,
      submission,
    ],
  );

  const onToggleWalkieTalkie = useCallback(
    () => controller.voice.setWalkieTalkie((prev) => !prev),
    [controller.voice],
  );

  const [primary, destructive, borderDefault] = useCSSVariable([
    '--color-primary',
    '--color-destructive',
    '--color-border',
  ]) as string[];
  const prefersReducedMotion = useReducedMotion();

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

  const bannerLayout = prefersReducedMotion
    ? undefined
    : LinearTransition.duration(transitionDurations[150]);
  const bannerEntering = prefersReducedMotion
    ? FadeIn.duration(transitionDurations[150])
    : FadeInDown.duration(transitionDurations[150]);
  const bannerExiting = prefersReducedMotion
    ? FadeOut.duration(transitionDurations[100])
    : FadeOutUp.duration(transitionDurations[100]);

  return (
    <Animated.View className="w-full gap-3" layout={bannerLayout} testID={presentation.shellTestID}>
      {controller.showAttachments ? <ComposerAttachmentRow /> : undefined}
      {!showVoicePanel && controller.enhance.isEnhanceOpen ? (
        <Animated.View entering={bannerEntering} exiting={bannerExiting}>
          <InlineEnhanceTray
            instruction={controller.enhance.enhanceInstruction}
            onInstructionChange={controller.enhance.setEnhanceInstruction}
            onPresetSelect={(instruction) =>
              void controller.enhance.runEnhance({
                instruction,
                text: controller.getMessage(),
                onEnhanced: controller.setMessage,
              })
            }
            onCancel={controller.enhance.closeEnhance}
            onConfirm={() =>
              void controller.enhance.runEnhance({
                text: controller.getMessage(),
                onEnhanced: controller.setMessage,
              })
            }
            isEnhancing={controller.enhance.isEnhancing}
            error={controller.enhance.enhanceError}
          />
        </Animated.View>
      ) : undefined}
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
        {errorBanner ? (
          <Animated.View entering={bannerEntering} exiting={bannerExiting} layout={bannerLayout}>
            {errorBanner}
          </Animated.View>
        ) : undefined}
        {showVoicePanel ? (
          <Animated.View
            entering={FadeIn.duration(transitionDurations[150])}
            exiting={FadeOut.duration(transitionDurations[100])}
            key="voice-panel"
          >
            <VoiceRecordingPanel
              startedAt={controller.voice.recordingStartedAt}
              onCancel={() => void controller.voice.cancelVoiceRecording()}
              onDone={() => void controller.voice.handleVoicePress()}
              phase={isRecording ? 'recording' : 'sending'}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(transitionDurations[150])}
            exiting={FadeOut.duration(transitionDurations[100])}
            key="composer-fields"
          >
            <ComposerActiveArea
              composerProps={props}
              messageStore={controller.messageStore}
              entryMode={controller.entryMode}
              manualEntryKind={controller.manualEntryKind}
              onManualEntryKindChange={controller.setManualEntryKind}
              uploadedAttachmentCount={controller.uploadedAttachmentIds.length}
              isFocused={controller.isFocused}
              showAttachments={controller.showAttachments}
              isInteractionBusy={controller.isInteractionBusy}
              isSubmitting={submission.isSubmitting}
              canPickMedia={controller.canPickMedia}
              canToggleVoice={controller.canToggleVoice}
              voice={controller.voice}
              enhance={controller.enhance}
              onToggleWalkieTalkie={props.mode === 'chat' ? onToggleWalkieTalkie : undefined}
              onFocus={controller.handleInputFocus}
              onBlur={controller.handleInputBlur}
              onSubmit={handleActiveAreaSubmit}
              onChangeMessage={controller.setMessage}
            />
          </Animated.View>
        )}
      </Card>
    </Animated.View>
  );
}
