import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '~/components/Button'
import TextInput from '~/components/text-input'
import AppIcon from '~/components/ui/icon'
import { Text, makeStyles, theme } from '~/theme'

interface NoteEditingSheetProps {
  title: string
  text: string
  scheduledFor: Date | null
  isSaving?: boolean
  onTextChange: (value: string) => void
  onScheduledForChange: (value: Date | null) => void
  onSave: () => void | Promise<void>
  onShare?: () => void
  onAddToCalendar?: () => void
  onPrint?: () => void
}

export function NoteEditingSheet({
  title,
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
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const footerPaddingBottom = theme.spacing.m_16
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const pickerValue = useMemo(() => scheduledFor ?? new Date(), [scheduledFor])

  const dueDateLabel = useMemo(() => {
    if (!scheduledFor) {
      return 'Set due date'
    }

    return scheduledFor.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }, [scheduledFor])

  const openDatePicker = useCallback(() => {
    if (isSaving) {
      return
    }
    setIsDatePickerOpen(true)
  }, [isSaving])

  const closeDatePicker = useCallback(() => {
    setIsDatePickerOpen(false)
  }, [])

  const clearDueDate = useCallback(() => {
    closeDatePicker()
    onScheduledForChange(null)
  }, [closeDatePicker, onScheduledForChange])

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === 'dismissed' || !selectedDate) {
        closeDatePicker()
        return
      }

      closeDatePicker()
      onScheduledForChange(selectedDate)
    },
    [closeDatePicker, onScheduledForChange],
  )

  return (
    <View style={styles.container} testID="note-editing-sheet">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.handle} testID="note-editing-sheet-handle" />

        <View style={styles.header} testID="note-editing-sheet-header">
          <Text variant="caption" color="text-tertiary" style={styles.kicker}>
            Workspace
          </Text>
          <View style={styles.headerRow}>
            <Text variant="header" color="foreground" style={styles.headerTitle}>
              {title}
            </Text>
            {onShare ? (
              <Pressable
                onPress={onShare}
                accessibilityLabel="Share note"
                accessibilityRole="button"
                style={styles.shareButton}
              >
                <AppIcon name="share-from-square" size={16} color={theme.colors['text-secondary']} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.editorCard} testID="note-editing-sheet-editor">
          <TextInput
            testID="note-editing-sheet-input"
            label="Note"
            placeholder="Write your note"
            value={text}
            editable={!isSaving}
            multiline
            onChangeText={onTextChange}
            style={styles.inputText}
          />
        </View>

        <View style={styles.metadataCard} testID="note-editing-sheet-metadata">
          <Text variant="caption" color="text-tertiary" style={styles.kicker}>
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
              <AppIcon name="calendar" size={16} color={theme.colors.foreground} />
            </View>
            <View style={styles.dueDateTextColumn}>
              <Text
                variant="body"
                color="foreground"
                testID="note-editing-sheet-due-date-label"
              >
                {dueDateLabel}
              </Text>
              <Text variant="small" color="text-secondary">
                {scheduledFor ? 'Tap to change the time or clear it' : 'Optional'}
              </Text>
            </View>
          </Pressable>

          {scheduledFor ? (
            <View style={styles.metadataActions}>
              <Button
                disabled={isSaving}
                onPress={clearDueDate}
                size="xs"
                testID="note-editing-sheet-clear-due-date"
                variant="ghost"
                title="Clear due date"
              />
            </View>
          ) : null}

          {isDatePickerOpen ? (
            <DateTimePicker
              display="spinner"
              mode="datetime"
              testID="note-editing-sheet-date-picker"
              value={pickerValue}
              onChange={handleDateChange}
            />
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + footerPaddingBottom }]}
        testID="note-editing-sheet-footer"
      >
        <View style={styles.footerActions}>
          {onAddToCalendar && scheduledFor ? (
            <Button
              variant="outline"
              size="sm"
              onPress={onAddToCalendar}
              style={styles.footerSecondaryButton}
              title="Calendar"
            />
          ) : null}
          {onPrint ? (
            <Button
              variant="outline"
              size="sm"
              onPress={onPrint}
              style={styles.footerSecondaryButton}
              title="Print"
            />
          ) : null}
        </View>
        <Button
          disabled={isSaving}
          isLoading={isSaving}
          onPress={onSave}
          testID="note-editing-sheet-save"
          title="Save"
        />
      </View>
    </View>
  )
}

const useStyles = makeStyles((t) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    scrollContent: {
      paddingTop: t.spacing.sm_12,
      paddingHorizontal: t.spacing.m_16,
      paddingBottom: t.spacing.ml_24,
      rowGap: t.spacing.ml_24,
    },
    handle: {
      alignSelf: 'center',
      backgroundColor: t.colors['border-default'],
      borderRadius: t.borderRadii.full,
      height: 4,
      width: 36,
    },
    header: {
      rowGap: t.spacing.sm_8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm_8,
    },
    headerTitle: {
      flex: 1,
    },
    shareButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    kicker: {
      letterSpacing: 1,
    },
    editorCard: {
      backgroundColor: t.colors.background,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      padding: t.spacing.m_16,
    },
    inputText: {
      color: t.colors.foreground,
      fontSize: 16,
      fontWeight: '600',
      minHeight: 180,
      textAlignVertical: 'top',
    },
    metadataCard: {
      backgroundColor: t.colors.background,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      rowGap: t.spacing.sm_8,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.m_16,
    },
    dueDateControl: {
      alignItems: 'center',
      columnGap: t.spacing.sm_12,
      flexDirection: 'row',
    },
    dueDateIcon: {
      alignItems: 'center',
      backgroundColor: t.colors['bg-surface'],
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    dueDateTextColumn: {
      flex: 1,
      rowGap: t.spacing.xs_4,
    },
    metadataActions: {
      alignItems: 'flex-start',
    },
    footer: {
      borderTopWidth: 1,
      borderColor: t.colors['border-default'],
      paddingHorizontal: t.spacing.m_16,
      paddingTop: t.spacing.sm_12,
      gap: t.spacing.sm_8,
    },
    footerActions: {
      flexDirection: 'row',
      gap: t.spacing.sm_8,
    },
    footerSecondaryButton: {
      flex: 1,
    },
  })
})
