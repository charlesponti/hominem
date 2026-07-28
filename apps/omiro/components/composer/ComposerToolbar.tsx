import { useCallback, useState } from 'react';
import { ActionSheetIOS, View } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { CameraModal } from '~/components/media/camera-modal';
import { useComposerContext } from '~/components/composer/ComposerContext';
import { IconButton } from '~/components/ui/icon-button';
import t from '~/translations';

interface ComposerToolbarProps {
  canEnhance: boolean;
  canPickMedia: boolean;
  canSubmit: boolean;
  canToggleVoice: boolean;
  hasContent: boolean;
  isEnhancing: boolean;
  isRecordingElsewhere: boolean;
  isSubmitting: boolean;
  isVoiceBusy: boolean;
  onEnhancePress: () => void;
  onSubmit: () => void;
  onVoicePress: () => void;
  secondaryAction?: {
    accessibilityLabel: string;
    icon: SFSymbol;
    onPress: () => void;
    testID?: string;
  };
  submitAccessibilityLabel?: string;
  submitTestID: string;
}

export function ComposerToolbar(props: ComposerToolbarProps) {
  const { pickAttachment, handleCameraCapture } = useComposerContext();
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const showMenu = useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          t.chat.input.actionSheet.cancel,
          t.chat.input.actionSheet.takePhoto,
          t.chat.input.actionSheet.chooseFromLibrary,
        ],
        cancelButtonIndex: 0,
      },
      (i) => {
        if (i === 1) setIsCameraOpen(true);
        else if (i === 2) void pickAttachment();
      },
    );
  }, [pickAttachment]);

  return (
    <>
      <Reanimated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(120)}
        testID="composer-secondary-actions"
        style={{ borderColor: 'purple', borderWidth: 2, flexDirection: 'row', gap: 8 }}
      >
        <View style={{ flex: 1 }} />
        <IconButton
          accessibilityLabel={t.inboxComposer.composer.addAttachmentA11y}
          disabled={!props.canPickMedia}
          icon="paperclip"
          pill
          testID="composer-attach-button"
          onPress={showMenu}
        />
        {props.hasContent ? (
          <IconButton
            accessibilityLabel={t.inboxComposer.composer.enhanceTextA11y}
            disabled={!props.canEnhance}
            icon="wand.and.sparkles"
            pill
            onPress={props.onEnhancePress}
          />
        ) : null}
        {props.secondaryAction && props.hasContent ? (
          <IconButton
            accessibilityLabel={props.secondaryAction.accessibilityLabel}
            icon={props.secondaryAction.icon}
            pill
            testID={props.secondaryAction.testID}
            onPress={props.secondaryAction.onPress}
          />
        ) : null}
        {props.hasContent ? (
          <IconButton
            accessibilityLabel={
              props.submitAccessibilityLabel ??
              (props.isSubmitting ? t.chat.input.sendingA11y : t.chat.input.sendMessageA11y)
            }
            disabled={!props.canSubmit}
            icon="arrow.up"
            pill
            testID={props.submitTestID}
            onPress={props.onSubmit}
          />
        ) : (
          <IconButton
            accessibilityLabel={
              props.isRecordingElsewhere
                ? t.inboxComposer.composer.recordingElsewhereA11y
                : t.inboxComposer.composer.startVoiceInputA11y
            }
            disabled={!props.canToggleVoice}
            icon="mic.fill"
            pill
            testID="composer-mic-button"
            onPress={props.onVoicePress}
          />
        )}
      </Reanimated.View>
      <CameraModal
        visible={isCameraOpen}
        onCapture={(photo) => {
          void handleCameraCapture(photo).finally(() => setIsCameraOpen(false));
        }}
        onClose={() => setIsCameraOpen(false)}
      />
    </>
  );
}
