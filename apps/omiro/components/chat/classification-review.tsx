import type { ArtifactType } from '@hominem/rpc/types';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Text,
  transitionDurations,
  fontFamiliesNative,
  fontSizes,
  makeStyles,
  radii,
  spacing,
} from '~/components/theme';
import { Button } from '~/components/ui/button';
import { ModalOverlay } from '~/components/ui/modal-overlay';
import t from '~/translations';

interface ClassificationReviewProps {
  proposedType: ArtifactType;
  proposedTitle: string;
  proposedChanges: string[];
  previewContent: string;
  items?: { title: string; description?: string }[];
  onAccept: () => void;
  onReject: () => void;
}

export function ClassificationReview({
  proposedType,
  proposedTitle,
  proposedChanges,
  previewContent,
  items,
  onAccept,
  onReject,
}: ClassificationReviewProps) {
  const styles = useClassificationStyles();
  const insets = useSafeAreaInsets();
  const isEmptyExtraction = items !== undefined && items.length === 0;
  const acceptLabel =
    items !== undefined
      ? t.chat.actions.createTasksLabel(items.length)
      : t.chat.classification.saveLabel[proposedType];

  return (
    <ModalOverlay
      visible
      onClose={onReject}
      dismissOnBackdropPress={false}
      backdropToken="overlay-scrim"
      position="bottom"
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeInUp.duration(transitionDurations[150])}
        style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text color="text-secondary" style={styles.typeLabel}>
            {t.chat.classification.saveAsPrefix} {t.chat.classification.typeLabel[proposedType]}
          </Text>
          <Text style={styles.title}>{proposedTitle}</Text>
        </View>

        {proposedChanges.length > 0 ? (
          <View style={styles.changesList}>
            {proposedChanges.map((change, index) => (
              <View key={`${change}-${index}`} style={styles.changeRow}>
                <Text color="text-secondary" style={styles.dash}>
                  -
                </Text>
                <Text color="text-secondary" style={styles.changeText}>
                  {change}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {items === undefined ? (
          <ScrollView nestedScrollEnabled style={styles.preview}>
            <Text color="text-secondary" style={styles.previewText}>
              {previewContent}
            </Text>
          </ScrollView>
        ) : null}

        <View style={styles.actionsRow}>
          {isEmptyExtraction ? null : (
            <View style={styles.actionSlot}>
              <Button
                testID="classification-review-accept"
                label={acceptLabel}
                onPress={onAccept}
                variant="primary"
              />
            </View>
          )}
          <View style={styles.actionSlot}>
            <Button
              testID="classification-review-reject"
              label={t.chat.classification.discard}
              onPress={onReject}
              variant="secondary"
            />
          </View>
        </View>
      </Animated.View>
    </ModalOverlay>
  );
}

const useClassificationStyles = makeStyles((theme) => ({
  actionSlot: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  changeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[2],
  },
  changesList: {
    gap: spacing[1],
  },
  changeText: {
    flex: 1,
  },
  dash: {
    marginTop: 1,
    opacity: 0.4,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: theme.colors['border-default'],
    borderRadius: radii.sm,
    height: 4,
    marginBottom: spacing[1],
    width: 36,
  },
  header: {
    gap: spacing[1],
  },
  preview: {
    backgroundColor: theme.colors['muted'],
    borderColor: theme.colors['border-default'],
    borderRadius: radii.md,
    borderWidth: 1,
    maxHeight: 120,
    padding: spacing[3],
  },
  previewText: {
    fontFamily: fontFamiliesNative.mono,
  },
  sheet: {
    backgroundColor: theme.colors['background'],
    borderColor: theme.colors['border-default'],
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderTopWidth: 1,
    gap: spacing[4],
    padding: spacing[5],
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  typeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
}));
