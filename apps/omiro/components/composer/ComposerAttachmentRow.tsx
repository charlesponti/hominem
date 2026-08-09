import { transitionDurations } from '@ponti-studios/ui/tokens';
import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { useComposerAttachments } from '~/components/composer/ComposerContext';
import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import t from '~/translations';

const THUMB_SIZE = 48;
const BADGE_SIZE = 16;

export function ComposerAttachmentRow() {
  const { attachments, errors, isUploading, progressByAssetId, onRemove } =
    useComposerAttachments();
  const [primaryForeground] = useCSSVariable(['--color-primary-foreground']) as string[];
  const prefersReducedMotion = useReducedMotion();

  if (attachments.length === 0 && errors.length === 0 && !isUploading) return null;

  return (
    <Animated.View
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
                className="w-12 h-12 overflow-hidden bg-card"
                style={{ borderCurve: 'continuous' }}
                onPress={() => onRemove(a.id)}
                accessibilityLabel={t.notes.editor.removeFile(a.name)}
                accessibilityRole="button"
              >
                {a.localUri && (
                  <Image source={{ uri: a.localUri }} className="w-12 h-12" contentFit="cover" />
                )}
                <View
                  className="absolute top-1 right-1 w-4 h-4 bg-overlay-scrim items-center justify-center"
                  pointerEvents="none"
                >
                  <AppIcon name="xmark" size={BADGE_SIZE} tintColor={primaryForeground} />
                </View>
                {uploading && (
                  <>
                    <View className="absolute inset-0 bg-overlay-scrim" />
                    <View className="absolute bottom-0 left-0 right-0 h-1 bg-overlay-scrim">
                      <View className="bg-primary h-full" style={{ width: `${progress}%` }} />
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {errors.length > 0 && (
        <Animated.Text className="text-caption1 text-destructive">
          {errors.join(' · ')}
        </Animated.Text>
      )}
    </Animated.View>
  );
}
