import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useComposerAttachments } from '~/components/composer/ComposerContext';
import { makeStyles, withAlpha } from '~/components/theme';
import { transitionDurations } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import t from '~/translations';

const BADGE_SIZE = 16;

export function ComposerAttachmentRow() {
  const { attachments, errors, isUploading, progressByAssetId, onRemove } =
    useComposerAttachments();
  const [primaryForeground] = useThemeColor(['--color-primary-foreground']) as string[];
  const prefersReducedMotion = useReducedMotion();

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {attachments.map((a) => {
            const progress = progressByAssetId[a.id] ?? 0;
            const uploading = progress > 0 && progress < 100;
            return (
              <Pressable
                key={a.id}
                style={[styles.s0, { borderCurve: 'continuous' }]}
                onPress={() => onRemove(a.id)}
                accessibilityLabel={t.notes.editor.removeFile(a.name)}
                accessibilityRole="button"
              >
                {a.localUri && (
                  <Image source={{ uri: a.localUri }} style={styles.s1} contentFit="cover" />
                )}
                <View style={styles.s2} pointerEvents="none">
                  <AppIcon name="xmark" size={BADGE_SIZE} tintColor={primaryForeground} />
                </View>
                {uploading && (
                  <>
                    <View style={styles.s3} />
                    <View style={styles.s4}>
                      <View style={[styles.s5, { width: `${progress}%` }]} />
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {errors.length > 0 && <Animated.Text style={styles.s6}>{errors.join(' · ')}</Animated.Text>}
    </Animated.View>
  );
}

const styles = makeStyles((theme) => ({
  s0: { width: 48, height: 48, overflow: 'hidden', backgroundColor: theme.colors.card },
  s1: { width: 48, height: 48 },
  s2: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    backgroundColor: theme.colors.overlayScrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  s3: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.overlayScrim,
  },
  s4: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: theme.colors.overlayScrim,
  },
  s5: { backgroundColor: theme.colors.primary, height: '100%' },
  s6: { ...theme.typography.caption1, color: theme.colors.destructive },
}));
