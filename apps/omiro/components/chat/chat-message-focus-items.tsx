import type { ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';

export function FocusItems({ message }: { message: ChatMessageItem }) {
  if (!message.focus_items?.length) {
    return null;
  }

  return (
    <View style={styles.focusItems}>
      {message.focus_items.map((focusItem) => (
        <View key={focusItem.id} style={styles.focusItem}>
          <Text>{focusItem.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = makeStyles((theme) => ({
  focusItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  focusItem: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
}));
