import { Image } from 'expo-image';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useComposerAttachments } from '~/components/composer/ComposerContext';
import { makeStyles, useThemeColors } from '~/components/theme';
import { createLayoutTransition } from '~/components/theme/animations';
import { radii, spacing } from '~/components/theme/tokens';
import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import t from '~/translations';

export function ComposerAttachmentRow() {
  const { attachments, errors, isUploading, progressByAssetId, onRemove } =
    useComposerAttachments();
  const themeColors = useThemeColors();
  const styles = useStyles();
  const prefersReducedMotion = useReducedMotion();

  if (attachments.length === 0 && errors.length === 0 && !isUploading) return null;

  return (
    <Animated.View layout={createLayoutTransition(prefersReducedMotion)}>
      {attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {attachments.map((a) => {
            const progress = progressByAssetId[a.id] ?? 0;
            // 0 means still queued (not started); 100 means settled (done or
            // errored) — the progress overlay only makes sense in between.
            const uploading = progress > 0 && progress < 100;
            return (
              <Pressable
                key={a.id}
                style={styles.thumb}
                onPress={() => onRemove(a.id)}
                accessibilityLabel={t.notes.editor.removeFile(a.name)}
                accessibilityRole="button"
              >
                {a.localUri && (
                  <Image
                    source={{ uri: a.localUri }}
                    style={styles.thumbImage}
                    contentFit="cover"
                  />
                )}
                <View style={styles.thumbBadge} pointerEvents="none">
                  <AppIcon
                    name="xmark"
                    size={spacing[2] * 2}
                    tintColor={themeColors['primary-foreground']}
                  />
                </View>
                {uploading && (
                  <>
                    <View style={styles.thumbDim} />
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {errors.length > 0 && (
        <Animated.Text style={styles.errorText}>{errors.join(' · ')}</Animated.Text>
      )}
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  row: {
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  thumb: {
    width: spacing[4] * 3,
    height: spacing[4] * 3,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: theme.colors['card'],
  },
  thumbImage: {
    width: spacing[4] * 3,
    height: spacing[4] * 3,
  },
  thumbBadge: {
    position: 'absolute',
    top: spacing[1],
    right: spacing[1],
    width: spacing[2] * 2,
    height: spacing[2] * 2,
    borderRadius: radii.sm,
    backgroundColor: theme.colors['overlay-scrim'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors['overlay-scrim'],
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: spacing[1],
    backgroundColor: theme.colors['overlay-scrim'],
  },
  progressFill: {
    backgroundColor: theme.colors.primary,
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.destructive,
  },
}));
