import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Button, StyleSheet, View } from 'react-native';

import { makeStyles } from '~/theme';

interface Props {
  size: number;
  url: string | null;
  onUpload: (filePath: string) => void;
}

export default function Avatar({ url, size = 150, onUpload }: Props) {
  const styles = useStyles();
  const [uploading, setUploading] = useState(false);
  const [localUploadUrl, setLocalUploadUrl] = useState<string | null>(null);
  const displayUrl = localUploadUrl ?? url;
  const avatarSize = { height: size, width: size };

  async function uploadAvatar() {
    try {
      setUploading(true);

      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Restrict to only images
        allowsMultipleSelection: false, // Can only select one image
        allowsEditing: true, // Allows the user to crop / rotate their photo before uploading it
        quality: 1,
        exif: false, // We don't want nor need that data.
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picker.');
        return;
      }

      const image = result.assets[0];
      console.log('Got image', image);

      if (!image.uri) {
        throw new Error('No image uri!'); // Realistically, this should never happen, but just in case...
      }

      const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const filename = `avatar-${Date.now()}.${fileExt}`;
      const destination = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.copyAsync({ from: image.uri, to: destination });
      setLocalUploadUrl(destination);
      onUpload(destination);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      } else {
        throw error;
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      {displayUrl ? (
        <Image
          source={{ uri: displayUrl }}
          accessibilityLabel="Avatar"
          contentFit="cover"
          style={[avatarSize, styles.avatar]}
        />
      ) : (
        <View style={[avatarSize, styles.avatar, styles.noImage]}>
          <Button
            title={uploading ? 'Uploading ...' : 'Upload'}
            onPress={uploadAvatar}
            disabled={uploading}
          />
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      width: '100%',
      rowGap: t.spacing.sm_8,
      alignItems: 'center',
    },
    avatar: {
      borderRadius: 1000,
      overflow: 'hidden',
      maxWidth: '100%',
    },
    noImage: {
      backgroundColor: t.colors['emphasis-faint'],
      borderColor: t.colors['border-default'],
      borderWidth: 1,
      borderRadius: 1000,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }),
);
