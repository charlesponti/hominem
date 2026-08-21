import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import { makeStyles, useThemeColor, withAlpha } from '~/components/theme';
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

export function CameraModal({ visible, onCapture, onClose }: CameraModalProps) {
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const device = useCameraDevice(facing);
  const photoOutput = usePhotoOutput();
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const [borderDefault, background, primaryForeground] = useThemeColor([
    '--color-border',
    '--color-background',
    '--color-primary-foreground',
  ]) as [string, string, string];

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
    if (!canRequestPermission) {
      await Linking.openSettings();
      return;
    }
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
      handleIndicatorStyle={{ backgroundColor: borderDefault, width: 40, height: 4 }}
      backgroundStyle={{ backgroundColor: background }}
      onDismiss={handleDismiss}
    >
      <BottomSheetView style={{ flex: 1, backgroundColor: background }}>
        {hasPermission && device ? (
          <View style={styles.cameraContainer}>
            <Camera
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              device={device}
              isActive={visible}
              outputs={[photoOutput]}
            />
            <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
              <Pressable
                onPress={handleDismiss}
                style={styles.closeButton}
                accessibilityLabel={t.camera.closeA11y}
              >
                <AppIcon name="xmark" size={20} tintColor={primaryForeground} />
              </Pressable>

              <Pressable
                onPress={() => void handleCapture()}
                disabled={isTakingPhoto}
                style={[styles.captureButton, isTakingPhoto && styles.captureButtonDisabled]}
                accessibilityLabel={t.camera.takePhotoA11y}
              >
                <View style={styles.captureIndicator} />
              </Pressable>

              <Pressable
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                style={styles.flipButton}
                accessibilityLabel={t.camera.flipCameraA11y}
              >
                <AppIcon name="camera.rotate" size={20} tintColor={primaryForeground} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionMessage}>
              {canRequestPermission
                ? t.camera.permission.message
                : t.camera.permission.deniedMessage}
            </Text>
            <Pressable onPress={() => void handleRequestPermissions()} style={styles.grantButton}>
              <Text style={styles.grantButtonText}>
                {canRequestPermission
                  ? t.camera.permission.grant
                  : t.camera.permission.openSettings}
              </Text>
            </Pressable>
            <Pressable onPress={handleDismiss} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>{t.camera.permission.cancel}</Text>
            </Pressable>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = makeStyles((theme) => ({
  cameraContainer: { flex: 1 },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: theme.colors.overlayScrim,
  },
  captureIndicator: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: theme.colors.primaryForeground,
  },
  flipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: theme.colors.overlayScrim,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  permissionMessage: { ...theme.typography.body, color: theme.colors.foreground },
  grantButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  grantButtonText: { ...theme.typography.body, color: theme.colors.foreground },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelButtonText: { ...theme.typography.body, color: theme.colors.mutedForeground },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 2,
    borderWidth: 4,
    borderColor: theme.colors.primaryForeground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: { opacity: 0.5 },
}));
