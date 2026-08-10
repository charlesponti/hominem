import type { ReactNode } from 'react';
import type { ModalProps } from 'react-native';
import { Modal, Pressable, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

export type ModalOverlayPosition = 'top' | 'center' | 'bottom';

interface ModalOverlayProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  position?: ModalOverlayPosition;
  dismissOnBackdropPress?: boolean;
  backdropToken?: 'overlay-scrim' | 'overlay-scrim';
  animationType?: ModalProps['animationType'];
  statusBarTranslucent?: boolean;
}

export function ModalOverlay({
  visible,
  onClose,
  children,
  position = 'center',
  dismissOnBackdropPress = true,
  backdropToken = 'overlay-scrim',
  animationType = 'fade',
  statusBarTranslucent = false,
}: ModalOverlayProps) {
  const scrimColor = useCSSVariable(`--color-${backdropToken}`) as string;
  const Backdrop = dismissOnBackdropPress ? Pressable : View;

  const positionClass =
    position === 'top' ? 'justify-start' : position === 'bottom' ? 'justify-end' : 'justify-center';

  return (
    <Modal
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent={statusBarTranslucent}
      transparent
      visible={visible}
    >
      <Backdrop
        onPress={dismissOnBackdropPress ? onClose : undefined}
        className={`flex-1 ${positionClass}`}
        style={{ backgroundColor: scrimColor }}
      >
        {children}
      </Backdrop>
    </Modal>
  );
}
