import type { ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';

import { makeStyles } from '~/components/theme';

type ToolCall = NonNullable<ChatMessageItem['toolCalls']>[number];

export function MessageToolCalls({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <View style={styles.toolCalls}>
      {toolCalls.map((toolCall: ToolCall) => (
        <View
          key={toolCall.toolCallId || `${toolCall.toolName}:${JSON.stringify(toolCall.args)}`}
          style={styles.toolCall}
        >
          <Text style={styles.toolName}>{toolCall.toolName}</Text>
          <Text style={styles.toolCallArgs}>
            {toolCall.args ? JSON.stringify(toolCall.args, null, 2) : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = makeStyles((theme) => ({
  toolCalls: { width: '100%', gap: 8, marginBottom: 12 },
  toolCall: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    gap: 8,
    padding: 8,
  },
  toolName: { ...theme.typography.footnote, color: theme.colors.foreground, fontWeight: '600' },
  toolCallArgs: {
    backgroundColor: theme.colors.foreground,
    ...theme.typography.mono,
    color: theme.colors.secondary,
    borderRadius: theme.radius.sm,
    padding: 8,
  },
}));
