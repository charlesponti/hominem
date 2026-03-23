import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useInputContext } from '~/components/input/input-context'
import { Text, makeStyles } from '~/theme'

export const NoteContextScreen = () => {
  const styles = useStyles()
  const { attachments, message } = useInputContext()

  return (
    <View style={styles.container} testID="note-context-screen">
      <Text variant="caption" color="text-secondary" style={styles.label}>
        Note
      </Text>
      <Text variant="header" color="foreground">
        Draft in progress
      </Text>
      <Text variant="body" color="text-secondary">
        Use the composer below to keep writing, attach material, or branch into chat.
      </Text>
      <View style={styles.summaryCard}>
        <Text variant="small" color="text-tertiary">
          Current draft
        </Text>
        <Text variant="bodyLarge" color="foreground">
          {message.trim().length > 0 ? message : 'No note content yet'}
        </Text>
        <Text variant="body" color="text-secondary">
          {attachments.length === 0
            ? 'No attachments staged'
            : `${attachments.length} attachment${attachments.length === 1 ? '' : 's'} staged`}
        </Text>
      </View>
    </View>
  )
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: t.spacing.sm_12,
      paddingBottom:
        t.spacing.xl_64 + t.spacing.xl_64 + t.spacing.xl_64 + t.spacing.ml_24 + t.spacing.xs_4,
      paddingHorizontal: t.spacing.m_16,
      paddingTop: t.spacing.m_16,
    },
    label: {
      letterSpacing: 1,
    },
    summaryCard: {
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.md,
      gap: t.spacing.sm_8,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.m_16,
    },
  }),
)
