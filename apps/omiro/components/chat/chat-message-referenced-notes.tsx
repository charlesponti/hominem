import { getReferencedNoteLabel, type ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

export function ReferencedNotes({ message }: { message: ChatMessageItem }) {
  const [textSecondary] = useCSSVariable(['--color-muted-foreground']) as string[];

  if (!Array.isArray(message.referencedNotes) || message.referencedNotes.length === 0) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {message.referencedNotes.map((note) => (
        <View
          key={note.id}
          className="items-center bg-popover border border-border rounded-sm flex-row gap-1 px-2 py-1"
        >
          <Text style={{ color: textSecondary, fontSize: 12 }}>{getReferencedNoteLabel(note)}</Text>
        </View>
      ))}
    </View>
  );
}
