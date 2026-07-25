import React, { useCallback, useRef } from 'react';
import { TextInput } from 'react-native';

import { InlineEnhancePanel } from '~/components/ai/InlineEnhancePanel';
import { ComposerKit, useComposerController } from '~/components/composer';
import { ComposerAttachmentRow } from '~/components/composer/ComposerAttachmentRow';
import { ComposerProvider } from '~/components/composer/ComposerContext';
import { getComposerSubmissionConfig } from '~/components/composer/composerSubmission.helpers';
import { InlineErrorBanner } from '~/components/composer/InlineErrorBanner';
import {
  useComposerSubmission,
  type ComposerSubmitKind,
} from '~/components/composer/useComposerSubmission';
import { getVoiceComposerErrorPresentation } from '~/components/composer/voiceComposerInput.helpers';
import { VoiceRecordingPanel } from '~/components/composer/VoiceRecordingPanel';
import t from '~/translations';

interface ComposerInboxProps {
  mode: 'inbox';
  initialMessage?: string;
  onDraftChange?: (msg: string) => void;
  onClearDraft?: () => void;
  entryMode?: 'mixed' | 'note' | 'chat';
  onComplete?: () => void;
  testID?: string;
}

interface ComposerChatProps {
  mode: 'chat';
  chatId: string;
  testID?: string;
}

export type ComposerProps = ComposerInboxProps | ComposerChatProps;

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
    (kind: ComposerSubmitKind) =>
      void submission.submit(
        {
          canSubmit: controller.canSubmit,
          clearComposer: controller.clearComposer,
          fileIds: controller.uploadedAttachmentIds,
          message: controller.message,
        },
        kind,
      ),
    [controller, submission],
  );

  const isInbox = props.mode === 'inbox';
  const isChatMode = presentation.isChatMode;
  const isChatEntryMode = presentation.isChatEntryMode;
  const secondaryAction =
    presentation.secondarySubmitKind === 'note'
      ? {
          accessibilityLabel: t.inboxComposer.composer.saveNoteA11y,
          icon: 'doc.text' as const,
          onPress: () => submit('note'),
          testID: 'composer-save-note',
        }
      : presentation.secondarySubmitKind === 'start-chat'
        ? {
            accessibilityLabel: t.inboxComposer.composer.openChatA11y,
            icon: 'bubble.left' as const,
            onPress: () => submit('start-chat'),
            testID: 'composer-start-chat',
          }
        : undefined;
  const inputPlaceholder =
    isChatMode || isChatEntryMode
      ? t.chat.input.messagePlaceholder
      : t.inboxComposer.composer.placeholder;
  const shellTestID = presentation.shellTestID;
  const inputTestID = presentation.inputTestID;

  return (
    <ComposerKit
      testID={shellTestID}
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
    >
      <ComposerKit.Input
        inputRef={inputRef}
        value={controller.message}
        onChangeText={controller.setMessage}
        placeholder={inputPlaceholder}
        testID={inputTestID}
        isColumnLayout={controller.isColumnLayout}
        onFocus={controller.handleInputFocus}
        onBlur={controller.handleInputBlur}
      />
      <ComposerKit.Toolbar
        mode={isInbox ? 'inbox' : 'chat'}
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
        submitTestID={
          isInbox
            ? isChatEntryMode
              ? 'composer-submit-chat'
              : 'composer-submit-note'
            : 'composer-submit-message'
        }
        submitAccessibilityLabel={
          isInbox
            ? isChatEntryMode
              ? t.inbox.screen.startChatSubmitA11y
              : t.inboxComposer.composer.saveNoteA11y
            : undefined
        }
        secondaryAction={secondaryAction}
      />
    </ComposerKit>
  );
}
