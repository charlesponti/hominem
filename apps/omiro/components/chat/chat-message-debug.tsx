import type { ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';

export function MessageDebug({
  message,
  hasReasoning,
}: {
  message: ChatMessageItem;
  hasReasoning: boolean;
}) {
  return (
    <View className="bg-background border border-border rounded-md gap-1 px-3 py-3 w-full">
      <Text className="text-mono text-foreground opacity-80">ID: {message.id}</Text>
      <Text className="text-mono text-foreground opacity-80">Role: {message.role}</Text>
      <Text className="text-mono text-foreground opacity-80">
        Created: {message.created_at || 'unknown'}
      </Text>
      <Text className="text-mono text-foreground opacity-80">
        Reasoning: {hasReasoning ? 'present' : 'none'}
      </Text>
      <Text className="text-mono text-foreground opacity-80">
        Tool calls: {message.toolCalls?.length ?? 0}
      </Text>
    </View>
  );
}
