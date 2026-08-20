import type { ArtifactType } from '@hominem/rpc/types';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, withAlpha } from '~/components/theme';
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
        style={[{ paddingBottom: insets.bottom + 16 }, styles.s0]}
      >
        <View style={styles.s1} />
        <View style={styles.s2}>
          <Text style={styles.s3}>
            {t.chat.classification.saveAsPrefix} {t.chat.classification.typeLabel[proposedType]}
          </Text>
          <Text style={styles.s4}>{proposedTitle}</Text>
        </View>

        {proposedChanges.length > 0 ? (
          <View style={styles.s5}>
            {proposedChanges.map((change, index) => (
              <View key={`${change}-${index}`} style={styles.s6}>
                <Text style={styles.s7}>-</Text>
                <Text style={styles.s8}>{change}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {items === undefined ? (
          <ScrollView nestedScrollEnabled style={styles.s9}>
            <Text style={styles.s10}>{previewContent}</Text>
          </ScrollView>
        ) : null}

        <View style={styles.s11}>
          {isEmptyExtraction ? null : (
            <View style={styles.s12}>
              <Button
                testID="classification-review-accept"
                label={acceptLabel}
                onPress={onAccept}
                variant="primary"
              />
            </View>
          )}
          <View style={styles.s13}>
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
  s0: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: 24,
    padding: 32,
  },
  s1: {
    alignSelf: 'center',
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    height: 4,
    marginBottom: 8,
    width: 36,
  },
  s2: { gap: 8 },
  s3: {
    ...theme.typography.caption1,
    color: theme.colors.mutedForeground,
    fontWeight: '500',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  s4: { fontWeight: '500' },
  s5: { gap: 8 },
  s6: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  s7: { color: theme.colors.mutedForeground, marginTop: 1, opacity: 0.4 },
  s8: { color: theme.colors.mutedForeground, flex: 1 },
  s9: {
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    maxHeight: 120,
    padding: 16,
  },
  s10: { color: theme.colors.mutedForeground, fontFamily: 'Menlo' },
  s11: { flexDirection: 'row', gap: 12 },
  s12: { flex: 1 },
  s13: { flex: 1 },
}));
