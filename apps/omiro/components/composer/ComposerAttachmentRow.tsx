import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useComposerAttachments } from '~/components/composer/ComposerContext';
import { fontSizes, lineHeights, makeStyles, useThemeColors } from '~/components/theme';
import { createLayoutTransition } from '~/components/theme/animations';
import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import t from '~/translations';

const THUMB_SIZE = 48;
const BADGE_SIZE = 16;

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {attachments.map((a) => {
            const progress = progressByAssetId[a.id] ?? 0;
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
                    size={BADGE_SIZE}
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
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: theme.colors['card'],
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumbBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
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
    height: 4,
    backgroundColor: theme.colors['overlay-scrim'],
  },
  progressFill: {
    backgroundColor: theme.colors.primary,
    height: '100%',
  },
  errorText: {
    fontSize: fontSizes.caption1,
    lineHeight: lineHeights.caption,
    color: theme.colors.destructive,
  },
}));
