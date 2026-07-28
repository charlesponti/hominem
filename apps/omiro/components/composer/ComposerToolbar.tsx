import { useCallback, useState } from 'react';
import { ActionSheetIOS, View } from 'react-native';

import { useComposerContext } from '~/components/composer/ComposerContext';
import { CameraModal } from '~/components/media/camera-modal';
import { PillButton } from '~/components/ui/pill-button';
import t from '~/translations';

import { useComposerSurfaceStyles } from './composer.styles';

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
  submitAccessibilityLabel?: string;
  submitTestID: string;
}

export function ComposerToolbar(props: ComposerToolbarProps) {
  const { pickAttachment, handleCameraCapture } = useComposerContext();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const styles = useComposerSurfaceStyles();

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
      <View style={styles.row}>
        <PillButton
          accessibilityLabel={t.inboxComposer.composer.addAttachmentA11y}
          disabled={!props.canPickMedia}
          icon="paperclip"
          testID="composer-attach-button"
          onPress={showMenu}
        />
        {props.hasContent ? (
          <PillButton
            accessibilityLabel={t.inboxComposer.composer.enhanceTextA11y}
            disabled={!props.canEnhance}
            icon="wand.and.sparkles"
            onPress={props.onEnhancePress}
          />
        ) : null}
        {props.hasContent ? (
          <PillButton
            accessibilityLabel={
              props.submitAccessibilityLabel ??
              (props.isSubmitting ? t.chat.input.sendingA11y : t.chat.input.sendMessageA11y)
            }
            disabled={!props.canSubmit}
            icon="arrow.up"
            testID={props.submitTestID}
            onPress={props.onSubmit}
          />
        ) : (
          <PillButton
            accessibilityLabel={
              props.isRecordingElsewhere
                ? t.inboxComposer.composer.recordingElsewhereA11y
                : t.inboxComposer.composer.startVoiceInputA11y
            }
            disabled={!props.canToggleVoice}
            icon="mic.fill"
            testID="composer-mic-button"
            onPress={props.onVoicePress}
          />
        )}
      </View>
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
