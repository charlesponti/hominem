import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import { Text, makeStyles, useThemeColors } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

type CapturedPhoto = {
  uri: string;
  fileName?: string;
};

type CameraModalProps = {
  visible: boolean;
  onCapture: (photo: CapturedPhoto) => void;
  onClose: () => void;
};

const useStyles = makeStyles((theme) => ({
  sheetBackground: {
    backgroundColor: theme.colors['background'],
  },
  dragHandle: {
    backgroundColor: theme.colors['border-default'],
    width: 40,
    height: 4,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors['background'],
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    ...StyleSheet.absoluteFill,
  },
  controls: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: theme.spacing.xl,
    position: 'absolute',
    right: 0,
  },
  sideButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: theme.borderRadii.md,
    backgroundColor: theme.colors['overlay-scrim'],
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadii.sm,
    borderWidth: 4,
    borderColor: theme.colors['primary-foreground'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadii.md,
    backgroundColor: theme.colors['primary-foreground'],
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  permissionButton: {
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  permissionCancel: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
}));

export function CameraModal({ visible, onCapture, onClose }: CameraModalProps) {
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const styles = useStyles();
  const modalRef = useRef<BottomSheetModal>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const { hasPermission, requestPermission } = useCameraPermission();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const device = useCameraDevice(facing);
  const photoOutput = usePhotoOutput();
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const handleCapture = async () => {
    if (isTakingPhoto || !device) return;

    setIsTakingPhoto(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await photoOutput.capturePhotoToFile({}, {});
      const uri = photo.filePath.startsWith('file://')
        ? photo.filePath
        : `file://${photo.filePath}`;
      const captured: CapturedPhoto = {
        uri,
        fileName: `photo_${Date.now()}.jpg`,
      };

      if (mediaPermission?.granted) {
        Alert.alert(t.camera.savePhoto.title, t.camera.savePhoto.message, [
          { text: t.camera.savePhoto.skip, style: 'cancel', onPress: () => onCapture(captured) },
          {
            text: t.camera.savePhoto.save,
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
      Alert.alert(t.camera.error.title, t.camera.error.message);
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

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      modalRef.current?.present();
      return;
    }

    modalRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      handleIndicatorStyle={styles.dragHandle}
      backgroundStyle={styles.sheetBackground}
      onDismiss={handleDismiss}
    >
      <BottomSheetView style={styles.container}>
        {hasPermission && device ? (
          <View style={styles.cameraContainer}>
            <Camera
              style={styles.camera}
              device={device}
              isActive={visible}
              outputs={[photoOutput]}
            />
            <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
              <Pressable
                onPress={handleDismiss}
                style={styles.sideButton}
                accessibilityLabel={t.camera.closeA11y}
              >
                <AppIcon name="xmark" size={20} tintColor={themeColors['primary-foreground']} />
              </Pressable>

              <Pressable
                onPress={() => void handleCapture()}
                disabled={isTakingPhoto}
                style={[styles.captureButton, isTakingPhoto && styles.captureButtonDisabled]}
                accessibilityLabel={t.camera.takePhotoA11y}
              >
                <View style={styles.captureInner} />
              </Pressable>

              <Pressable
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                style={styles.sideButton}
                accessibilityLabel={t.camera.flipCameraA11y}
              >
                <AppIcon
                  name="camera.rotate"
                  size={20}
                  tintColor={themeColors['primary-foreground']}
                />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.permissionContainer}>
            <Text variant="body" color="text-primary">
              {t.camera.permission.message}
            </Text>
            <Pressable
              onPress={() => void handleRequestPermissions()}
              style={styles.permissionButton}
            >
              <Text variant="body" color="text-primary">
                {t.camera.permission.grant}
              </Text>
            </Pressable>
            <Pressable onPress={handleDismiss} style={styles.permissionCancel}>
              <Text variant="body" color="text-secondary">
                {t.camera.permission.cancel}
              </Text>
            </Pressable>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
