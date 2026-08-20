import type { ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';

export function MessageDebug({
  message,
  hasReasoning,
}: {
  message: ChatMessageItem;
  hasReasoning: boolean;
}) {
  return (
    <View style={styles.s0}>
      <Text style={styles.s1}>ID: {message.id}</Text>
      <Text style={styles.s2}>Role: {message.role}</Text>
      <Text style={styles.s3}>Created: {message.created_at || 'unknown'}</Text>
      <Text style={styles.s4}>Reasoning: {hasReasoning ? 'present' : 'none'}</Text>
      <Text style={styles.s5}>Tool calls: {message.toolCalls?.length ?? 0}</Text>
    </View>
  );
}

const styles = makeStyles((theme) => ({
  s0: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '100%',
  },
  s1: { ...theme.typography.mono, color: theme.colors.foreground, opacity: 0.8 },
  s2: { ...theme.typography.mono, color: theme.colors.foreground, opacity: 0.8 },
  s3: { ...theme.typography.mono, color: theme.colors.foreground, opacity: 0.8 },
  s4: { ...theme.typography.mono, color: theme.colors.foreground, opacity: 0.8 },
  s5: { ...theme.typography.mono, color: theme.colors.foreground, opacity: 0.8 },
}));
