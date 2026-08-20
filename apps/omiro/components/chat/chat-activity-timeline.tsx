import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
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
    <Card accessibilityLiveRegion="polite" style={styles.s0} testID="chat-activity">
      <View style={styles.s1}>
        <View style={styles.s2}>
          <Text style={styles.s3}>{stageCopy[generation.stage]}</Text>
          {generation.stage !== 'preparing' ? (
            <Text style={styles.s4}>
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
        {isStopping ? <Text style={styles.s5}>{t.chat.generation.stopping}</Text> : null}
        {(generation.stage === 'failed' || generation.stage === 'cancelled') && onRetry ? (
          <Pressable
            accessibilityLabel={t.chat.generation.retryA11y}
            accessibilityRole="button"
            style={styles.s6}
            onPress={onRetry}
          >
            <Text style={styles.s7}>{t.chat.generation.retry}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = makeStyles((theme) => ({
  s0: {
    backgroundColor: theme.colors.muted,
    borderWidth: 0,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  s1: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  s2: { flexShrink: 1, gap: 4 },
  s3: { ...theme.typography.footnote, color: theme.colors.foreground },
  s4: { ...theme.typography.caption1, color: theme.colors.mutedForeground },
  s5: { ...theme.typography.footnote, color: theme.colors.mutedForeground },
  s6: { paddingHorizontal: 8, paddingVertical: 4 },
  s7: { ...theme.typography.footnote, color: theme.colors.primary },
}));
