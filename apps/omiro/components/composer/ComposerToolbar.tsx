import { useCallback, useState } from 'react';
import { ActionSheetIOS, View } from 'react-native';

import { useComposerContext } from '~/components/composer/ComposerContext';
import { CameraModal } from '~/components/media/camera-modal';
import { useThemeColors } from '~/components/theme';
import { IconButton } from '~/components/ui/icon-button';
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
  isWalkieTalkie?: boolean;
  onEnhancePress: () => void;
  onSubmit: () => void;
  onVoicePress: () => void;
  onToggleWalkieTalkie?: () => void;
  submitAccessibilityLabel?: string;
  submitTestID: string;
}

export function ComposerToolbar(props: ComposerToolbarProps) {
  const { pickAttachment, handleCameraCapture } = useComposerContext();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const styles = useComposerSurfaceStyles();
  const themeColors = useThemeColors();

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
        <IconButton
          accessibilityLabel={t.inboxComposer.composer.addAttachmentA11y}
          disabled={!props.canPickMedia}
          icon="paperclip"
          testID="composer-attach-button"
          onPress={showMenu}
        />
        {props.hasContent ? (
          <IconButton
            accessibilityLabel={t.inboxComposer.composer.enhanceTextA11y}
            disabled={!props.canEnhance}
            icon="wand.and.sparkles"
            onPress={props.onEnhancePress}
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
            testID={props.submitTestID}
            onPress={props.onSubmit}
          />
        ) : (
          <>
            {props.onToggleWalkieTalkie ? (
              <IconButton
                accessibilityLabel={
                  props.isWalkieTalkie
                    ? t.inboxComposer.composer.disableWalkieTalkieA11y
                    : t.inboxComposer.composer.enableWalkieTalkieA11y
                }
                icon="antenna.radiowaves.left.and.right"
                testID="composer-walkie-talkie-toggle"
                tintColor={props.isWalkieTalkie ? themeColors.primary : undefined}
                onPress={props.onToggleWalkieTalkie}
              />
            ) : null}
            <IconButton
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
          </>
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
