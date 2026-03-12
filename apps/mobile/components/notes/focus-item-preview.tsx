import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Text, makeStyles } from '~/theme';
import type { FocusItemInput } from '~/utils/services/notes/types';

import AppIcon from '../ui/icon';

function getReadableDate(date: FocusItemInput['due_date']) {
  if (!date) return null;

  try {
    const dateObject = new Date(date);
    return dateObject.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

type FocusItemPreviewProps = {
  disabled: boolean;
  focusItem: FocusItemInput;
  onDeleteClick: (focusItem: FocusItemInput) => void;
  onCreateClick: (focusItem: FocusItemInput) => void;
} & ViewProps;
const FocusItemPreview = ({
  disabled,
  focusItem,
  onDeleteClick,
  onCreateClick,
  ...props
}: FocusItemPreviewProps) => {
  const styles = useFocusItemStyles();
  const readableDate = getReadableDate(focusItem.due_date);
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
          {focusItem.text}
        </Text>
        {focusItem.due_date && readableDate ? <Text variant="caption">{readableDate}</Text> : null}
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
      borderRadius: t.borderRadii.l_12,
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
