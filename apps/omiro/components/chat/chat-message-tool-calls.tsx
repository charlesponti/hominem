import type { ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

type ToolCall = NonNullable<ChatMessageItem['toolCalls']>[number];

export function MessageToolCalls({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [textPrimary] = useCSSVariable(['--color-foreground']) as string[];

  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <View className="gap-1">
      {toolCalls.map((toolCall: ToolCall, index: number) => (
        <View
          key={toolCall.toolCallId || `tool-call-${index}`}
          className="bg-background border border-border rounded-md gap-1 p-3"
        >
          <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '600' }}>
            {toolCall.toolName}
          </Text>
          <Text className="text-mono text-muted-foreground">
            {toolCall.args ? JSON.stringify(toolCall.args, null, 2) : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}
