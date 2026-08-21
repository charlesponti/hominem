import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { makeStyles, useThemeColor, withAlpha } from '~/components/theme';
import { Card, IconButton } from '~/components/ui';
import type { ChatGenerationState } from '~/services/chat/chat-generation';
import t from '~/translations';

import AppIcon from '../ui/icon';

const stageCopy = {
  preparing: t.chat.generation.thinking,
  saving: t.chat.generation.saving,
  stopping: t.chat.generation.stopping,
  failed: t.chat.generation.failed,
  cancelled: t.chat.generation.cancelled,
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
  const primary = useThemeColor('--color-primary') as string;
  const isActive = generation.stage === 'preparing' || generation.stage === 'saving';
  const isStopping = generation.stage === 'stopping';

  return (
    <Card accessibilityLiveRegion="polite" style={styles.timeline} testID="chat-activity">
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
          <IconButton
            accessibilityLabel={t.chat.generation.stopA11y}
            onPress={onCancel}
            variant="plain"
          >
            <AppIcon name="stop.fill" size={16} />
          </IconButton>
        ) : null}
        {isStopping ? (
          <Text style={styles.timelineDescription}>{t.chat.generation.stopping}</Text>
        ) : null}
        {(generation.stage === 'failed' || generation.stage === 'cancelled') && onRetry ? (
          <Pressable
            accessibilityLabel={t.chat.generation.retryA11y}
            accessibilityRole="button"
            style={styles.timelineAction}
            onPress={onRetry}
          >
            <Text style={styles.timelineActionText}>{t.chat.generation.retry}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = makeStyles((theme) => ({
  timeline: {
    backgroundColor: theme.colors.muted,
    borderWidth: 0,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineContent: { flexShrink: 1, gap: 4 },
  timelineTitle: { ...theme.typography.footnote, color: theme.colors.foreground },
  timelineMeta: { ...theme.typography.caption1, color: theme.colors.mutedForeground },
  timelineDescription: { ...theme.typography.footnote, color: theme.colors.mutedForeground },
  timelineAction: { paddingHorizontal: 8, paddingVertical: 4 },
  timelineActionText: { ...theme.typography.footnote, color: theme.colors.primary },
}));
