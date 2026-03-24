import type { Note } from '@hominem/rpc/types';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '~/components/Button';
import TextInput from '~/components/text-input';
import AppIcon from '~/components/ui/icon';
import { Text, makeStyles, theme } from '~/theme';

interface NoteEditingSheetProps {
  note?: Note;
  text: string;
  scheduledFor: Date | null;
  isSaving?: boolean;
  onTextChange: (value: string) => void;
  onScheduledForChange: (value: Date | null) => void;
  onSave: () => void | Promise<void>;
  onShare?: () => void;
  onAddToCalendar?: () => void;
  onPrint?: () => void;
}

export function NoteEditingSheet({
  note,
  text,
  scheduledFor,
  isSaving = false,
  onTextChange,
  onScheduledForChange,
  onSave,
  onShare,
  onAddToCalendar,
  onPrint,
}: NoteEditingSheetProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const pickerValue = useMemo(() => scheduledFor ?? new Date(), [scheduledFor]);

  const dueDateLabel = useMemo(() => {
    if (!scheduledFor) {
      return 'Set due date';
    }

    return scheduledFor.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [scheduledFor]);

  const title = useMemo(() => {
    return note?.title || note?.excerpt || note?.content || 'Untitled note';
  }, [note?.content, note?.excerpt, note?.title]);

  const openDatePicker = useCallback(() => {
    if (isSaving) {
      return;
    }
    setIsDatePickerOpen(true);
  }, [isSaving]);

  const closeDatePicker = useCallback(() => {
    setIsDatePickerOpen(false);
  }, []);

  const clearDueDate = useCallback(() => {
    closeDatePicker();
    onScheduledForChange(null);
  }, [closeDatePicker, onScheduledForChange]);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === 'dismissed' || !selectedDate) {
        closeDatePicker();
        return;
      }

      closeDatePicker();
      onScheduledForChange(selectedDate);
    },
    [closeDatePicker, onScheduledForChange],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      testID="note-editing-sheet"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + theme.spacing.ml_24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header} testID="note-editing-sheet-header">
          <Text variant="caption" color="text-tertiary" style={styles.kicker}>
            Note
          </Text>
          <Text variant="header" color="foreground" numberOfLines={2}>
            {title}
          </Text>
        </View>

        <View style={styles.editorCard} testID="note-editing-sheet-editor">
          <TextInput
            testID="note-editing-sheet-input"
            placeholder="Start writing..."
            placeholderTextColor={theme.colors['text-tertiary']}
            value={text}
            editable={!isSaving}
            multiline
            onChangeText={onTextChange}
            style={styles.inputText}
          />
        </View>

        <View style={styles.metadataSection}>
          <Text variant="caption" color="text-tertiary" style={styles.sectionLabel}>
            Due date
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={scheduledFor ? 'Edit due date' : 'Set due date'}
            disabled={isSaving}
            onPress={openDatePicker}
            testID="note-editing-sheet-due-date-control"
            style={styles.dueDateControl}
          >
            <View style={styles.dueDateIcon}>
              <AppIcon name="calendar" size={20} color={theme.colors.foreground} />
            </View>
            <View style={styles.dueDateTextColumn}>
              <Text variant="body" color="foreground" testID="note-editing-sheet-due-date-label">
                {dueDateLabel}
              </Text>
              <Text variant="small" color="text-secondary">
                {scheduledFor ? 'Tap to change' : 'Optional'}
              </Text>
            </View>
            {scheduledFor && (
              <Pressable
                onPress={clearDueDate}
                style={styles.clearButton}
                accessibilityLabel="Clear due date"
              >
                <AppIcon name="xmark" size={16} color={theme.colors['text-secondary']} />
              </Pressable>
            )}
          </Pressable>

          {isDatePickerOpen ? (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                display="spinner"
                mode="datetime"
                testID="note-editing-sheet-date-picker"
                value={pickerValue}
                onChange={handleDateChange}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.actionsSection}>
          <Text variant="caption" color="text-tertiary" style={styles.sectionLabel}>
            Actions
          </Text>
          <View style={styles.actionsRow}>
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                onPress={onShare}
                style={styles.actionButton}
                title="Share"
              />
            )}
            {onAddToCalendar && scheduledFor && (
              <Button
                variant="outline"
                size="sm"
                onPress={onAddToCalendar}
                style={styles.actionButton}
                title="Add to Calendar"
              />
            )}
            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                onPress={onPrint}
                style={styles.actionButton}
                title="Print"
              />
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer} testID="note-editing-sheet-footer">
        <Button
          disabled={isSaving}
          isLoading={isSaving}
          onPress={onSave}
          testID="note-editing-sheet-save"
          title="Save"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    scrollContent: {
      paddingHorizontal: t.spacing.m_16,
      paddingTop: t.spacing.m_16,
      rowGap: t.spacing.m_16,
    },
    header: {
      rowGap: t.spacing.xs_4,
    },
    kicker: {
      letterSpacing: 1,
    },
    editorCard: {
      backgroundColor: t.colors['bg-elevated'],
      borderRadius: t.borderRadii.md,
      padding: t.spacing.m_16,
      minHeight: 200,
    },
    inputText: {
      color: t.colors.foreground,
      fontSize: 17,
      lineHeight: 24,
      minHeight: 180,
      textAlignVertical: 'top',
    },
    metadataSection: {
      rowGap: t.spacing.sm_8,
    },
    sectionLabel: {
      letterSpacing: 1,
    },
    dueDateControl: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: t.spacing.sm_12,
      backgroundColor: t.colors['bg-elevated'],
      borderRadius: t.borderRadii.md,
      padding: t.spacing.m_16,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    dueDateIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: t.borderRadii.md,
      backgroundColor: t.colors['bg-surface'],
    },
    dueDateTextColumn: {
      flex: 1,
      rowGap: t.spacing.xs_4,
    },
    clearButton: {
      padding: t.spacing.sm_8,
    },
    datePickerContainer: {
      alignItems: 'center',
      paddingVertical: t.spacing.sm_8,
    },
    actionsSection: {
      rowGap: t.spacing.sm_8,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: t.spacing.sm_8,
    },
    actionButton: {
      flex: 1,
    },
    footer: {
      borderTopWidth: 1,
      borderColor: t.colors['border-default'],
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
      gap: t.spacing.sm_8,
    },
  });
});
