import type { ChatMessageItem } from '@hominem/chat';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '~/components/theme';

export function MessageDebug({
  message,
  hasReasoning,
}: {
  message: ChatMessageItem;
  hasReasoning: boolean;
}) {
  return (
    <View style={styles.debugPanel}>
      <Text style={styles.debugText}>ID: {message.id}</Text>
      <Text style={styles.debugText}>Role: {message.role}</Text>
      <Text style={styles.debugText}>Created: {message.created_at || 'unknown'}</Text>
      <Text style={styles.debugText}>Reasoning: {hasReasoning ? 'present' : 'none'}</Text>
      <Text style={styles.debugText}>Tool calls: {message.toolCalls?.length ?? 0}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  debugPanel: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '100%',
  },
  debugText: { ...theme.typography.mono, color: theme.colors.foreground, opacity: 0.8 },
});
