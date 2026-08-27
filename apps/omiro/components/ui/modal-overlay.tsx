import type { ReactNode } from 'react';
import type { ModalProps } from 'react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '~/components/theme';

type ModalOverlayPosition = 'top' | 'center' | 'bottom';

interface ModalOverlayProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  position?: ModalOverlayPosition;
  dismissOnBackdropPress?: boolean;
  backdropToken?: 'overlay-scrim';
  animationType?: ModalProps['animationType'];
  statusBarTranslucent?: boolean;
}

export function ModalOverlay({
  visible,
  onClose,
  children,
  position = 'center',
  dismissOnBackdropPress = true,
  animationType = 'fade',
  statusBarTranslucent = false,
}: ModalOverlayProps) {
  const { overlayScrim: scrimColor } = useAppTheme().colors;

  return (
    <Modal
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent={statusBarTranslucent}
      transparent
      visible={visible}
    >
      {dismissOnBackdropPress ? (
        <Pressable
          onPress={onClose}
          style={[styles.backdrop, styles[position], { backgroundColor: scrimColor }]}
        >
          {children}
        </Pressable>
      ) : (
        <View style={[styles.backdrop, styles[position], { backgroundColor: scrimColor }]}>
          {children}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  top: { justifyContent: 'flex-start' },
  center: { justifyContent: 'center' },
  bottom: { justifyContent: 'flex-end' },
});
