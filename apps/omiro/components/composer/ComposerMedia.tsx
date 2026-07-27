import React, { useCallback, useState } from 'react';
import { ActionSheetIOS } from 'react-native';

import { useComposerContext } from '~/components/composer/ComposerContext';
import { TOOLBAR_ICON_SIZE, TOOL_BTN_SIZE } from '~/components/composer/constants';
import { CameraModal } from '~/components/media/camera-modal';
import { spacing } from '~/components/theme/tokens';
import { IconButton } from '~/components/ui/icon-button';
import t from '~/translations';

interface ComposerMediaProps {
  accessibilityLabel: string;
  disabled?: boolean;
}

export function ComposerMedia({ accessibilityLabel, disabled = false }: ComposerMediaProps) {
  const { pickAttachment, handleCameraCapture } = useComposerContext();
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const showPlusMenu = useCallback(() => {
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
        // Indices line up with `options` above: 0 is Cancel, 1 is Take Photo,
        // 2 is Choose From Library — ActionSheetIOS gives no named-key access.
        if (i === 1) setIsCameraOpen(true);
        else if (i === 2) void pickAttachment();
      },
    );
  }, [pickAttachment]);

  return (
    <>
      <IconButton
        accessibilityLabel={accessibilityLabel}
        icon="plus"
        iconSize={TOOLBAR_ICON_SIZE}
        size={TOOL_BTN_SIZE}
        variant="ghost"
        circular
        disabled={disabled}
        disabledOpacity={0.4}
        pressedOpacity={0.65}
        hitSlop={spacing[2]}
        testID="composer-attach-button"
        onPress={showPlusMenu}
      />
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
