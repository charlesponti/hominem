import type { ArtifactType } from '@hominem/rpc/types';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
        style={{ paddingBottom: insets.bottom + 16 }}
        className="bg-background border-t border-border rounded-t-md gap-6 p-8"
      >
        <View className="self-center bg-border rounded-sm h-1 mb-2 w-9" />
        <View className="gap-2">
          <Text className="text-muted-foreground text-caption1 font-medium tracking-[1] uppercase">
            {t.chat.classification.saveAsPrefix} {t.chat.classification.typeLabel[proposedType]}
          </Text>
          <Text className="text-base font-medium">{proposedTitle}</Text>
        </View>

        {proposedChanges.length > 0 ? (
          <View className="gap-2">
            {proposedChanges.map((change, index) => (
              <View key={`${change}-${index}`} className="flex-row items-start gap-3">
                <Text className="text-muted-foreground mt-[1px] opacity-40">-</Text>
                <Text className="text-muted-foreground flex-1">{change}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {items === undefined ? (
          <ScrollView
            nestedScrollEnabled
            className="bg-muted border border-border rounded-md max-h-[120px] p-4"
          >
            <Text className="text-muted-foreground font-mono">{previewContent}</Text>
          </ScrollView>
        ) : null}

        <View className="flex-row gap-3">
          {isEmptyExtraction ? null : (
            <View className="flex-1">
              <Button
                testID="classification-review-accept"
                label={acceptLabel}
                onPress={onAccept}
                variant="primary"
              />
            </View>
          )}
          <View className="flex-1">
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
