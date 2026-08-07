import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { useCSSVariable } from 'uniwind';

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

  const { hasPermission, requestPermission } = useCameraPermission();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const device = useCameraDevice(facing);
  const photoOutput = usePhotoOutput();
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const [borderDefault, background, primaryForeground] = useCSSVariable([
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
          <View className="flex-1">
            <Camera
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              device={device}
              isActive={visible}
              outputs={[photoOutput]}
            />
            <View
              className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-6"
              style={{ paddingBottom: insets.bottom + 24 }}
            >
              <Pressable
                onPress={handleDismiss}
                className="items-center justify-center w-12 h-12 rounded-md bg-overlay-scrim"
                accessibilityLabel={t.camera.closeA11y}
              >
                <AppIcon name="xmark" size={20} tintColor={primaryForeground} />
              </Pressable>

              <Pressable
                onPress={() => void handleCapture()}
                disabled={isTakingPhoto}
                className={`w-[72px] h-[72px] rounded-sm border-4 border-primary-foreground items-center justify-center ${isTakingPhoto ? 'opacity-50' : ''}`}
                accessibilityLabel={t.camera.takePhotoA11y}
              >
                <View className="w-14 h-14 rounded-md bg-primary-foreground" />
              </Pressable>

              <Pressable
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                className="items-center justify-center w-12 h-12 rounded-md bg-overlay-scrim"
                accessibilityLabel={t.camera.flipCameraA11y}
              >
                <AppIcon name="camera.rotate" size={20} tintColor={primaryForeground} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-4 px-6">
            <Text className="text-body text-foreground">{t.camera.permission.message}</Text>
            <Pressable
              onPress={() => void handleRequestPermissions()}
              className="border border-border rounded-md px-4 py-2"
            >
              <Text className="text-body text-foreground">{t.camera.permission.grant}</Text>
            </Pressable>
            <Pressable onPress={handleDismiss} className="px-4 py-2">
              <Text className="text-body text-muted-foreground">{t.camera.permission.cancel}</Text>
            </Pressable>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
