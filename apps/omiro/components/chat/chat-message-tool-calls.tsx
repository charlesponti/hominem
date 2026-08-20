import type { ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';

type ToolCall = NonNullable<ChatMessageItem['toolCalls']>[number];

export function MessageToolCalls({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [textPrimary] = useThemeColor(['--color-foreground']) as string[];

  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <View style={styles.s0}>
      {toolCalls.map((toolCall: ToolCall, index: number) => (
        <View key={toolCall.toolCallId || `tool-call-${index}`} style={styles.s1}>
          <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '600' }}>
            {toolCall.toolName}
          </Text>
          <Text style={styles.s2}>
            {toolCall.args ? JSON.stringify(toolCall.args, null, 2) : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = makeStyles((theme) => ({
  s0: { gap: 4 },
  s1: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    gap: 4,
    padding: 12,
  },
  s2: { ...theme.typography.mono, color: theme.colors.mutedForeground },
}));
