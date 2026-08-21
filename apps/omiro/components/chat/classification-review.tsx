import type { ArtifactType } from '@hominem/rpc/types';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles } from '~/components/theme';
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
        entering={FadeInUp.duration(150)}
        style={[{ paddingBottom: insets.bottom + 16 }, styles.container]}
      >
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <Text style={styles.typeLabel}>
            {t.chat.classification.saveAsPrefix} {t.chat.classification.typeLabel[proposedType]}
          </Text>
          <Text style={styles.title}>{proposedTitle}</Text>
        </View>

        {proposedChanges.length > 0 ? (
          <View style={styles.changesList}>
            {proposedChanges.map((change, index) => (
              <View key={`${change}-${index}`} style={styles.changeItem}>
                <Text style={styles.changeBullet}>-</Text>
                <Text style={styles.changeText}>{change}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {items === undefined ? (
          <ScrollView nestedScrollEnabled style={styles.previewScrollArea}>
            <Text style={styles.previewText}>{previewContent}</Text>
          </ScrollView>
        ) : null}

        <View style={styles.actions}>
          {isEmptyExtraction ? null : (
            <View style={styles.acceptAction}>
              <Button
                testID="classification-review-accept"
                label={acceptLabel}
                onPress={onAccept}
                variant="primary"
              />
            </View>
          )}
          <View style={styles.rejectAction}>
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

const styles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: 24,
    padding: 32,
  },
  handleBar: {
    alignSelf: 'center',
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    height: 4,
    marginBottom: 8,
    width: 36,
  },
  header: { gap: 8 },
  typeLabel: {
    ...theme.typography.caption1,
    color: theme.colors.mutedForeground,
    fontWeight: '500',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  title: { fontWeight: '500' },
  changesList: { gap: 8 },
  changeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  changeBullet: { color: theme.colors.mutedForeground, marginTop: 1, opacity: 0.4 },
  changeText: { color: theme.colors.mutedForeground, flex: 1 },
  previewScrollArea: {
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    maxHeight: 120,
    padding: 16,
  },
  previewText: { color: theme.colors.mutedForeground, fontFamily: 'Menlo' },
  actions: { flexDirection: 'row', gap: 12 },
  acceptAction: { flex: 1 },
  rejectAction: { flex: 1 },
}));
