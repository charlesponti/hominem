import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import {
  useComposerAttachments,
  type ComposerAttachment,
} from '~/components/composer/ComposerContext';
import { makeStyles, transitionDurations, useThemeColor } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import t from '~/translations';

const BADGE_SIZE = 16;

function AttachmentItem({
  attachment,
  onRemove,
  primaryForeground,
  progress,
}: {
  attachment: ComposerAttachment;
  onRemove: (id: string) => void;
  primaryForeground: string;
  progress: number;
}) {
  const uploading = progress > 0 && progress < 100;
  return (
    <Pressable
      style={styles.attachmentContainer}
      onPress={() => onRemove(attachment.id)}
      accessibilityLabel={t.notes.editor.removeFile(attachment.name)}
      accessibilityRole="button"
    >
      {attachment.localUri && (
        <Image
          source={{ uri: attachment.localUri }}
          style={styles.attachmentImage}
          contentFit="cover"
        />
      )}
      <View style={styles.removeBadge} pointerEvents="none">
        <AppIcon name="xmark" size={BADGE_SIZE} tintColor={primaryForeground} />
      </View>
      {uploading && (
        <>
          <View style={styles.uploadOverlay} />
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </>
      )}
    </Pressable>
  );
}

export function ComposerAttachmentRow() {
  const { attachments, errors, isUploading, progressByAssetId, onRemove } =
    useComposerAttachments();
  const [primaryForeground] = useThemeColor(['--color-primary-foreground']) as string[];
  const prefersReducedMotion = useReducedMotion();
  const renderAttachment = useCallback(
    ({ item }: { item: ComposerAttachment }) => (
      <AttachmentItem
        attachment={item}
        onRemove={onRemove}
        primaryForeground={primaryForeground}
        progress={progressByAssetId[item.id] ?? 0}
      />
    ),
    [onRemove, primaryForeground, progressByAssetId],
  );

  if (attachments.length === 0 && errors.length === 0 && !isUploading) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(transitionDurations[150])}
      exiting={FadeOut.duration(transitionDurations[100])}
      layout={
        prefersReducedMotion ? undefined : LinearTransition.duration(transitionDurations[150])
      }
    >
      {attachments.length > 0 && (
        <FlashList
          data={attachments}
          horizontal
          keyExtractor={(attachment) => attachment.id}
          showsHorizontalScrollIndicator={false}
          renderItem={renderAttachment}
        />
      )}
      {errors.length > 0 && (
        <Animated.Text style={styles.errorText}>{errors.join(' · ')}</Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = makeStyles((theme) => ({
  attachmentContainer: {
    width: 48,
    height: 48,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  attachmentImage: { width: 48, height: 48 },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    backgroundColor: theme.colors.overlayScrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.overlayScrim,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: theme.colors.overlayScrim,
  },
  progressBarFill: { backgroundColor: theme.colors.primary, height: '100%' },
  errorText: { ...theme.typography.caption1, color: theme.colors.destructive },
}));
