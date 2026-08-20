import { getReferencedNoteLabel, type ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';

export function ReferencedNotes({ message }: { message: ChatMessageItem }) {
  const [textSecondary] = useThemeColor(['--color-muted-foreground']) as string[];

  if (!Array.isArray(message.referencedNotes) || message.referencedNotes.length === 0) {
    return null;
  }

  return (
    <View style={styles.s0}>
      {message.referencedNotes.map((note) => (
        <View key={note.id} style={styles.s1}>
          <Text style={{ color: textSecondary, fontSize: 12 }}>{getReferencedNoteLabel(note)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = makeStyles((theme) => ({
  s0: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  s1: {
    alignItems: 'center',
    backgroundColor: theme.colors.popover,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 2,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
}));
