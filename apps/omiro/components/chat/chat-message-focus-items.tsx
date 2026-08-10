import type { ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';

export function FocusItems({ message }: { message: ChatMessageItem }) {
  if (!message.focus_items?.length) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap gap-3">
      {message.focus_items.map((focusItem) => (
        <View
          key={focusItem.id}
          className="bg-background border border-border rounded-md px-3 py-2"
        >
          <Text>{focusItem.text}</Text>
        </View>
      ))}
    </View>
  );
}
