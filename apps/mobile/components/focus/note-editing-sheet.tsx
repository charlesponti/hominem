import React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

interface NoteEditingSheetProps {
  title: string
  text: string
  scheduledFor: Date | null
  isSaving?: boolean
  onTextChange: (value: string) => void
  onScheduledForChange: (value: Date | null) => void
  onSave: () => void | Promise<void>
}

type DatePickerEvent = {
  type: 'set' | 'dismissed' | 'neutralButtonPressed'
}

export function NoteEditingSheet({
  title,
  text,
  scheduledFor,
  isSaving = false,
  onTextChange,
  onScheduledForChange,
  onSave,
}: NoteEditingSheetProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const pickerValue = useMemo(() => scheduledFor ?? new Date(), [scheduledFor])

  const openDatePicker = useCallback(() => {
    if (!isSaving) {
      setIsDatePickerOpen(true)
    }
  }, [isSaving])

  const closeDatePicker = useCallback(() => {
    setIsDatePickerOpen(false)
  }, [])

  const handleDateChange = useCallback(
    (event: DatePickerEvent, selectedDate?: Date) => {
      if (event.type === 'dismissed' || !selectedDate) {
        closeDatePicker()
        return
      }

      closeDatePicker()
      onScheduledForChange(selectedDate)
    },
    [closeDatePicker, onScheduledForChange],
  )

  const clearDueDate = useCallback(() => {
    setIsDatePickerOpen(false)
    onScheduledForChange(null)
  }, [onScheduledForChange])

  const dueDateLabel = scheduledFor
    ? scheduledFor.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Set due date'
  const DateTimePicker = isDatePickerOpen
    ? require('@react-native-community/datetimepicker').default
    : null

  return (
    <View style={styles.sheet} testID="note-editing-sheet">
      <View style={styles.handle} testID="note-editing-sheet-handle" />

      <View style={styles.header} testID="note-editing-sheet-header">
        <Text style={styles.kicker}>
          Workspace
        </Text>
        <Text style={styles.headerTitle}>
          {title}
        </Text>
        <Text style={styles.headerBody}>
          Keep the note body in front, with supporting metadata just below it.
        </Text>
      </View>

      <View style={styles.editorCard} testID="note-editing-sheet-editor">
        <TextInput
          testID="note-editing-sheet-input"
          placeholder="Write your note"
          value={text}
          editable={!isSaving}
          multiline
          onChangeText={onTextChange}
          style={styles.inputText}
        />
      </View>

      <View style={styles.metadataCard} testID="note-editing-sheet-metadata">
        <Text style={styles.kicker}>
          Due date
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={scheduledFor ? 'Edit due date' : 'Set due date'}
          disabled={isSaving}
          onPress={openDatePicker}
          testID="note-editing-sheet-due-date-control"
          style={({ pressed }) => [
            styles.dueDateControl,
            pressed && !isSaving ? styles.dueDateControlPressed : null,
            isSaving ? styles.disabledControl : null,
          ]}
        >
          <View style={styles.dueDateIcon}>
            <Text style={styles.calendarGlyph}>⌁</Text>
          </View>
          <View style={styles.dueDateTextColumn}>
            <Text style={styles.dueDateText}>
              {dueDateLabel}
            </Text>
            <Text style={styles.dueDateHelp}>
              {scheduledFor ? 'Tap to change the time or clear it' : 'Optional'}
            </Text>
          </View>
        </Pressable>

        {scheduledFor ? (
          <View style={styles.metadataActions}>
            <Pressable
              disabled={isSaving}
              onPress={clearDueDate}
              testID="note-editing-sheet-clear-due-date"
              style={({ pressed }) => [
                styles.clearButton,
                pressed && !isSaving ? styles.clearButtonPressed : null,
                isSaving ? styles.disabledControl : null,
              ]}
            >
              <Text style={styles.clearButtonText}>Clear due date</Text>
            </Pressable>
          </View>
        ) : null}

        {DateTimePicker ? (
          <DateTimePicker
            display="spinner"
            mode="datetime"
            testID="note-editing-sheet-date-picker"
            value={pickerValue}
            onChange={handleDateChange}
          />
        ) : null}
      </View>

      <View style={styles.footer} testID="note-editing-sheet-footer">
        <Pressable
          disabled={isSaving}
          onPress={onSave}
          testID="note-editing-sheet-save"
          style={({ pressed }) => [
            styles.saveButton,
            pressed && !isSaving ? styles.saveButtonPressed : null,
            isSaving ? styles.disabledControl : null,
          ]}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const COLORS = {
  background: '#0f1115',
  foreground: '#ffffff',
  mutedSurface: '#171b22',
  border: '#2c3340',
  secondaryText: '#b2bbcc',
  tertiaryText: '#7e8798',
}

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: COLORS.background,
    flex: 1,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    rowGap: SPACING.xl,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: COLORS.border,
    borderRadius: 999,
    height: 4,
    width: 36,
  },
  header: {
    rowGap: SPACING.sm,
  },
  kicker: {
    color: COLORS.tertiaryText,
    letterSpacing: 1,
  },
  headerTitle: {
    color: COLORS.foreground,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerBody: {
    color: COLORS.secondaryText,
    fontSize: 15,
    lineHeight: 21,
  },
  editorCard: {
    backgroundColor: COLORS.mutedSurface,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  inputText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '600',
    minHeight: 180,
    textAlignVertical: 'top',
  },
  metadataCard: {
    backgroundColor: COLORS.mutedSurface,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    rowGap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  dueDateControl: {
    alignItems: 'center',
    columnGap: SPACING.md,
    flexDirection: 'row',
  },
  dueDateControlPressed: {
    opacity: 0.85,
  },
  disabledControl: {
    opacity: 0.45,
  },
  dueDateIcon: {
    alignItems: 'center',
    backgroundColor: '#11151b',
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  calendarGlyph: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '700',
  },
  dueDateTextColumn: {
    flex: 1,
    rowGap: SPACING.xs,
  },
  dueDateText: {
    color: COLORS.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  dueDateHelp: {
    color: COLORS.secondaryText,
    fontSize: 13,
  },
  metadataActions: {
    alignItems: 'flex-start',
  },
  clearButton: {
    alignSelf: 'flex-start',
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  clearButtonPressed: {
    opacity: 0.85,
  },
  clearButtonText: {
    color: COLORS.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  saveButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.foreground,
    borderRadius: 999,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '700',
  },
})
