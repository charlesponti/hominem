import { IconButton } from '@ponti-studios/ui/native';
import { useCallback, useState } from 'react';
import { ActionSheetIOS } from 'react-native';

import { useComposerContext } from '~/components/composer/ComposerContext';
import { CameraModal } from '~/components/media/camera-modal';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

interface ComposerAttachButtonProps {
  disabled: boolean;
}

export function ComposerAttachButton({ disabled }: ComposerAttachButtonProps) {
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
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.addAttachmentA11y}
        disabled={disabled}
        testID="composer-attach-button"
        variant="plain"
        onPress={showMenu}
      >
        <AppIcon name="plus" size={20} />
      </IconButton>
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
