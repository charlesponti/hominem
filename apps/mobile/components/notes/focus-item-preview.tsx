import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import type { Note } from '@hominem/hono-rpc/types';

import { Text, makeStyles } from '~/theme';
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp';

import AppIcon from '../ui/icon';

function getReadableDate(date: Note['scheduledFor']) {
  if (!date) return null;

  const dateObject = parseInboxTimestamp(date)

  return dateObject.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type FocusItemPreviewProps = {
  disabled: boolean;
  focusItem: Pick<Note, 'id' | 'title' | 'excerpt' | 'content' | 'scheduledFor'>;
  onDeleteClick: (focusItem: Pick<Note, 'id' | 'title' | 'excerpt' | 'content' | 'scheduledFor'>) => void;
  onCreateClick: (focusItem: Pick<Note, 'id' | 'title' | 'excerpt' | 'content' | 'scheduledFor'>) => void;
} & ViewProps;
const FocusItemPreview = ({
  disabled,
  focusItem,
  onDeleteClick,
  onCreateClick,
  ...props
}: FocusItemPreviewProps) => {
  const styles = useFocusItemStyles();
  const readableDate = getReadableDate(focusItem.scheduledFor);
  const onDeleteIconPress = () => {
    onDeleteClick(focusItem);
  };

  const onIconPress = () => {
    onCreateClick(focusItem);
  };

  return (
    <View style={[styles.item]} {...props}>
      <View style={[styles.info]}>
        <Text variant="body" color="black">
          {focusItem.title || focusItem.excerpt || focusItem.content}
        </Text>
        {focusItem.scheduledFor && readableDate ? <Text variant="caption">{readableDate}</Text> : null}
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

const useFocusItemStyles = makeStyles((t) =>
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

export default FocusItemPreview;
