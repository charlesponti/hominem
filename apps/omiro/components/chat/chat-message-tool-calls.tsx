import type { ChatMessageItem } from '@hominem/chat';
import { Pressable, Text, View } from 'react-native';

import { useStyles } from '~/components/theme';

type ToolCall = NonNullable<ChatMessageItem['toolCalls']>[number];

export function MessageToolCalls({
  messageId,
  onRespond,
  responding,
  toolCalls,
}: {
  messageId: string;
  onRespond?: (input: { messageId: string; toolCallId: string; approved: boolean }) => void;
  responding?: boolean;
  toolCalls: ToolCall[];
}) {
  const styles = useStyles((theme) => ({
    toolCalls: { width: '100%', gap: 8, marginBottom: 12 },
    toolCall: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadii.sm,
      gap: 8,
      padding: 8,
    },
    toolName: {
      ...theme.textVariants.footnote,
      color: theme.colors.foreground,
      fontWeight: '600',
    },
    toolCallArgs: {
      backgroundColor: theme.colors.foreground,
      ...theme.textVariants.mono,
      color: theme.colors.secondary,
      borderRadius: theme.borderRadii.sm,
      padding: 8,
    },
    actions: { flexDirection: 'row', gap: 8 },
    action: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadii.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    actionText: { ...theme.textVariants.footnote, color: theme.colors.foreground },
  }));

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
          {toolCall.confirmationStatus === 'pending' && onRespond ? (
            <View style={styles.actions}>
              <Pressable
                accessible
                accessibilityLabel={`Approve ${toolCall.toolName}`}
                accessibilityRole="button"
                disabled={responding}
                onPress={() => {
                  void onRespond({ messageId, toolCallId: toolCall.toolCallId, approved: true });
                }}
                style={styles.action}
                testID="tool-confirm-approve"
              >
                <Text style={styles.actionText}>Approve</Text>
              </Pressable>
              <Pressable
                accessible
                accessibilityLabel={`Reject ${toolCall.toolName}`}
                accessibilityRole="button"
                disabled={responding}
                onPress={() => {
                  void onRespond({ messageId, toolCallId: toolCall.toolCallId, approved: false });
                }}
                style={styles.action}
                testID="tool-confirm-reject"
              >
                <Text style={styles.actionText}>Reject</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
