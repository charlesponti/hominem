import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { Button } from '~/components/Button';
import TextInput from '~/components/text-input';
import AppIcon from '~/components/ui/icon';
import { Text, theme, makeStyles } from '~/theme';
import { getTimezone } from '~/utils/dates';
import queryClient from '~/utils/query-client';
import type { FocusItem } from '~/utils/services/notes/types';
import {
  useUpdateFocusItem,
  type UpdateFocusItemInput,
} from '~/utils/services/notes/use-update-focus';

export default function FocusItemView() {
  const styles = useStyles();
  const { id } = useLocalSearchParams();
  const updateFocusItem = useUpdateFocusItem();
  const focusItems: FocusItem[] = queryClient.getQueryData(['focusItems']) || [];
  const focusItem = focusItems?.find((item) => item.id === String(id));

  if (!focusItem) {
    return null;
  }

  const [text, setText] = useState(focusItem.text || '');
  const [category, _setCategory] = useState(focusItem.category || '');
  const [due_date, setDueDate] = useState(focusItem.due_date ? new Date(focusItem.due_date) : null);
  const [open, setOpen] = useState(false);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setOpen(false);
      return;
    }

    if (!selectedDate) {
      setOpen(false);
      return;
    }

    setOpen(false);
    setDueDate(selectedDate);
  };

  const dueDateTap = Gesture.Tap().onStart(() => {
    runOnJS(setOpen)(true);
  });

  const onFormSubmit = useCallback(async () => {
    if (!focusItem) {
      return;
    }

    const input: UpdateFocusItemInput = {
      id: focusItem.id,
      text,
      category,
      ...(due_date ? { due_date } : {}),
      timezone: getTimezone(),
    };

    try {
      await updateFocusItem.mutateAsync(input);
    } catch (error) {
      console.error(error);
    }
  }, [focusItem, updateFocusItem, category, due_date, text]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="caption" color="text-tertiary" style={styles.eyebrow}>
          Workspace
        </Text>
        <Text variant="header" color="foreground">
          {focusItem.text || 'Untitled note'}
        </Text>
        <Text variant="body" color="text-secondary">
          Edit the note directly and keep supporting metadata subordinate to the writing itself.
        </Text>
      </View>

      <View style={styles.formGroup}>
        <View style={styles.editorCard}>
          <TextInput
            aria-disabled
            placeholder="Focus item"
            label="Note"
            value={text}
            style={styles.inputText}
            onChange={(e) => setText(e.nativeEvent.text)}
          />
        </View>
        {due_date ? (
          <View style={styles.metadataCard}>
            <Text variant="caption" color="text-tertiary" style={styles.eyebrow}>
              Due date
            </Text>
            <View style={styles.dueDateRow}>
              <AppIcon name="calendar" size={16} color={theme.colors.foreground} />
              <GestureDetector gesture={dueDateTap}>
                <Text variant="body">
                  {due_date.toLocaleDateString()} {due_date.toLocaleTimeString()}
                </Text>
              </GestureDetector>
            </View>
            {open ? (
              <DateTimePicker
                value={due_date}
                mode="datetime"
                display="spinner"
                onChange={handleDateChange}
              />
            ) : null}
          </View>
        ) : null}
        <View style={styles.footer}>
          <Button onPress={onFormSubmit}>Save</Button>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: t.spacing.m_16,
      paddingTop: t.spacing.l_32,
      backgroundColor: t.colors.background,
    },
    header: {
      rowGap: t.spacing.sm_8,
    },
    eyebrow: {
      letterSpacing: 1,
    },
    formGroup: {
      rowGap: t.spacing.ml_24,
      marginTop: t.spacing.l_32,
    },
    editorCard: {
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.xl_20,
      backgroundColor: t.colors.background,
      padding: t.spacing.m_16,
    },
    inputText: {
      fontSize: 16,
      color: t.colors.foreground,
      fontWeight: '600',
    },
    metadataCard: {
      rowGap: t.spacing.sm_8,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.xl_20,
      backgroundColor: t.colors.background,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
    },
    dueDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: t.spacing.sm_12,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
  }),
);
