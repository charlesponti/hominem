import type { ArtifactType } from '@hominem/rpc/types';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '~/components/theme';
import { Button } from '~/components/ui/button';
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
  const isEmptyExtraction = items !== undefined && items.length === 0;
  const acceptLabel =
    items !== undefined
      ? t.chat.actions.createTasksLabel(items.length)
      : t.chat.classification.saveLabel[proposedType];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.typeLabel}>
          {t.chat.classification.saveAsPrefix} {t.chat.classification.typeLabel[proposedType]}
        </Text>
        <Text style={styles.title}>{proposedTitle}</Text>
      </View>

      {proposedChanges.length > 0 ? (
        <View style={styles.changesList}>
          {proposedChanges.map((change) => (
            <View key={change} style={styles.changeItem}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 24 },
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
});
