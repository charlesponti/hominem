import type { Note } from '@hominem/rpc/types';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Text, makeStyles } from '~/theme';
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp';

import AppIcon from '../ui/icon';

function getReadableDate(date: Note['scheduledFor']) {
  if (!date) return null;

  const dateObject = parseInboxTimestamp(date);

  return dateObject.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type NotePreviewProps = {
  disabled: boolean;
  note: Pick<Note, 'id' | 'title' | 'excerpt' | 'content' | 'scheduledFor'>;
  onDeleteClick: (
    note: Pick<Note, 'id' | 'title' | 'excerpt' | 'content' | 'scheduledFor'>,
  ) => void;
  onCreateClick: (
    note: Pick<Note, 'id' | 'title' | 'excerpt' | 'content' | 'scheduledFor'>,
  ) => void;
} & ViewProps;
const NotePreview = ({
  disabled,
  note,
  onDeleteClick,
  onCreateClick,
  ...props
}: NotePreviewProps) => {
  const styles = useNotePreviewStyles();
  const readableDate = getReadableDate(note.scheduledFor);
  const onDeleteIconPress = () => {
    onDeleteClick(note);
  };

  const onIconPress = () => {
    onCreateClick(note);
  };

  return (
    <View style={[styles.item]} {...props}>
      <View style={[styles.info]}>
        <Text variant="body" color="black">
          {note.title || note.excerpt || note.content}
        </Text>
        {note.scheduledFor && readableDate ? <Text variant="caption">{readableDate}</Text> : null}
      </View>
      <Pressable disabled={disabled} style={[styles.icon]} onPress={onDeleteIconPress}>
        <AppIcon name="trash" size={24} color="#d32f2f" />
      </Pressable>
      <Pressable disabled={disabled} style={[styles.icon]} onPress={onIconPress}>
        <AppIcon name="list-tree" size={24} color="#000" />
      </Pressable>
    </View>
  );
};

const useNotePreviewStyles = makeStyles((t) =>
  StyleSheet.create({
    item: {
      flexDirection: 'row',
      backgroundColor: t.colors['emphasis-faint'],
      borderRadius: t.borderRadii.md,
    },
    info: {
      flex: 1,
      paddingVertical: t.spacing.ml_24,
      paddingHorizontal: t.spacing.ml_24,
    },
    icon: {
      justifyContent: 'center',
      marginRight: t.spacing.m_16,
    },
  }),
);

export default NotePreview;
