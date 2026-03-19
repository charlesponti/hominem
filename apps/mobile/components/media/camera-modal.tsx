import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import AppIcon from '~/components/ui/icon';
import { Text, theme } from '~/theme';

type CapturedPhoto = {
  uri: string;
  fileName?: string;
};

type CameraModalProps = {
  visible: boolean;
  onCapture: (photo: CapturedPhoto) => void;
  onClose: () => void;
};

export function CameraModal({ visible, onCapture, onClose }: CameraModalProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const { hasPermission, requestPermission } = useCameraPermission();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const device = useCameraDevice(facing);

  const handleCapture = async () => {
    if (!cameraRef.current || isTakingPhoto || !device) return;

    setIsTakingPhoto(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePhoto();
      const uri = `file://${photo.path}`;
      const captured: CapturedPhoto = {
        uri,
        fileName: `photo_${Date.now()}.jpg`,
      };

      if (mediaPermission?.granted) {
        Alert.alert('Save photo?', 'Save this photo to your camera roll.', [
          { text: 'Skip', style: 'cancel', onPress: () => onCapture(captured) },
          {
            text: 'Save',
            onPress: async () => {
              await MediaLibrary.saveToLibraryAsync(uri);
              onCapture(captured);
            },
          },
        ]);
      } else {
        onCapture(captured);
      }
    } catch {
      Alert.alert('Camera error', 'Could not take photo. Please try again.');
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleRequestPermissions = async () => {
    await requestPermission();
    if (mediaPermission?.status === 'undetermined') {
      await requestMediaPermission();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {hasPermission && device ? (
          <Camera ref={cameraRef} style={styles.camera} device={device} isActive={visible} photo>
            <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
              <Pressable
                onPress={onClose}
                style={styles.sideButton}
                accessibilityLabel="Close camera"
              >
                <AppIcon name="x" size={20} color={theme.colors.white} />
              </Pressable>

              <Pressable
                onPress={() => void handleCapture()}
                disabled={isTakingPhoto}
                style={[styles.captureButton, isTakingPhoto && styles.captureButtonDisabled]}
                accessibilityLabel="Take photo"
              >
                <View style={styles.captureInner} />
              </Pressable>

              <Pressable
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                style={styles.sideButton}
                accessibilityLabel="Flip camera"
              >
                <AppIcon name="rotate" size={20} color={theme.colors.white} />
              </Pressable>
            </View>
          </Camera>
        ) : (
          <View style={styles.permissionContainer}>
            <Text variant="body" color="foreground">
              Camera access is required to take photos.
            </Text>
            <Pressable
              onPress={() => void handleRequestPermissions()}
              style={styles.permissionButton}
            >
              <Text variant="body" color="foreground">
                Grant permission
              </Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.permissionCancel}>
              <Text variant="body" color="text-secondary">
                Cancel
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  camera: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.ml_24,
  },
  sideButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.white,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.m_16,
    paddingHorizontal: theme.spacing.ml_24,
  },
  permissionButton: {
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md_10,
    paddingHorizontal: theme.spacing.m_16,
    paddingVertical: theme.spacing.sm_8,
  },
  permissionCancel: {
    paddingHorizontal: theme.spacing.m_16,
    paddingVertical: theme.spacing.sm_8,
  },
});
