import { ActivityIndicator, Button, Pressable, Text, View } from 'react-native';

import { useAppTheme, useStyles } from '~/components/theme';
import { Card } from '~/components/ui';
import type { ChatGenerationState } from '~/services/chat/chat-generation';
import t from '~/translations';

const stageCopy = {
  preparing: t.chat.generation.thinking,
  running: t.chat.generation.thinking,
  awaiting_confirmation: t.chat.generation.thinking,
  saving: t.chat.generation.saving,
  stopping: t.chat.generation.stopping,
  failed: t.chat.generation.failed,
  cancelled: t.chat.generation.cancelled,
  committed: t.chat.generation.saving,
} as const;

export function ChatActivityTimeline({
  generation,
  onCancel,
  onRetry,
}: {
  generation: ChatGenerationState;
  onCancel: () => void;
  onRetry?: () => void;
}) {
  const { primary } = useAppTheme().colors;
  const styles = useStyles((theme) => ({
    timeline: {
      backgroundColor: theme.colors.muted,
      borderWidth: 0,
      alignSelf: 'flex-start',
      maxWidth: '85%',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      zIndex: 10,
    },
    timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    timelineContent: { flexShrink: 1, gap: 4 },
    timelineTitle: { ...theme.textVariants.footnote, color: theme.colors.foreground },
    timelineMeta: { ...theme.textVariants.caption1, color: theme.colors.mutedForeground },
    timelineDescription: { ...theme.textVariants.footnote, color: theme.colors.mutedForeground },
    timelineActionText: { ...theme.textVariants.footnote, color: theme.colors.primary },
  }));
  const isActive =
    generation.stage === 'preparing' ||
    generation.stage === 'running' ||
    generation.stage === 'awaiting_confirmation' ||
    generation.stage === 'saving';
  const isStopping = generation.stage === 'stopping';

  return (
    <Card
      accessibilityLiveRegion="polite"
      onResponderRelease={isActive ? onCancel : undefined}
      onStartShouldSetResponder={isActive ? () => true : undefined}
      style={styles.timeline}
      testID="chat-activity"
    >
      <View style={styles.timelineRow}>
        <View style={styles.timelineContent}>
          <Text style={styles.timelineTitle}>{stageCopy[generation.stage]}</Text>
          {generation.stage !== 'preparing' ? (
            <Text style={styles.timelineMeta}>
              {generation.stage === 'saving'
                ? t.chat.generation.savingDetail
                : generation.stage === 'failed'
                  ? (generation.error ?? t.chat.generation.failedDetail)
                  : t.chat.generation.preparingDetail}
            </Text>
          ) : null}
        </View>
        {generation.stage === 'preparing' ? (
          <ActivityIndicator color={primary} size="small" />
        ) : null}
        {isActive ? (
          <Button
            accessibilityLabel={t.chat.generation.stopA11y}
            onPress={onCancel}
            title={t.chat.generation.stop}
            testID="chat-generation-stop"
          />
        ) : null}
        {isStopping ? (
          <Text style={styles.timelineDescription}>{t.chat.generation.stopping}</Text>
        ) : null}
        {(generation.stage === 'failed' || generation.stage === 'cancelled') && onRetry ? (
          <Pressable
            accessibilityLabel={t.chat.generation.retryA11y}
            accessibilityRole="button"
            onPress={onRetry}
          >
            <Text style={styles.timelineActionText}>{t.chat.generation.retry}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
