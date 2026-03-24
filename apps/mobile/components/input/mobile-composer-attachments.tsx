import { Pressable, StyleSheet, Text, View } from 'react-native'

import { theme } from '~/theme'

import type { MobileComposerAttachment } from './mobile-composer-state'

interface MobileComposerAttachmentsProps {
  attachments: MobileComposerAttachment[]
  onRemoveAttachment: (attachmentId: string) => void
  errors?: string[]
  isUploading?: boolean
  progress?: number
}

export function MobileComposerAttachments({
  attachments,
  onRemoveAttachment,
  errors = [],
  isUploading = false,
  progress = 0,
}: MobileComposerAttachmentsProps) {
  if (attachments.length === 0 && !isUploading && errors.length === 0) {
    return null
  }

  return (
    <View style={styles.attachments} testID="mobile-composer-attachments">
      {attachments.map((attachment) => (
        <Pressable
          key={attachment.id}
          onPress={() => onRemoveAttachment(attachment.id)}
          style={styles.attachmentChip}
          testID={`mobile-composer-attachment-${attachment.id}`}
        >
          <Text style={styles.attachmentLabel}>{attachment.name}</Text>
        </Pressable>
      ))}
      {isUploading ? (
        <View style={styles.statusChip} testID="mobile-composer-uploading">
          <Text style={styles.statusLabel}>{`Uploading ${progress}%`}</Text>
        </View>
      ) : null}
      {errors.map((error) => (
        <View key={error} style={styles.errorChip}>
          <Text style={styles.errorLabel}>{error}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm_8,
  },
  attachmentChip: {
    backgroundColor: theme.colors['bg-surface'],
    borderRadius: theme.borderRadii.full,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    paddingHorizontal: theme.spacing.sm_8,
    paddingVertical: theme.spacing.xs_4,
  },
  attachmentLabel: {
    color: theme.colors.foreground,
    fontSize: 12,
  },
  statusChip: {
    backgroundColor: theme.colors['bg-surface'],
    borderRadius: theme.borderRadii.full,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    paddingHorizontal: theme.spacing.sm_8,
    paddingVertical: theme.spacing.xs_4,
  },
  statusLabel: {
    color: theme.colors['text-secondary'],
    fontSize: 12,
  },
  errorChip: {
    backgroundColor: theme.colors['bg-surface'],
    borderRadius: theme.borderRadii.full,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    paddingHorizontal: theme.spacing.sm_8,
    paddingVertical: theme.spacing.xs_4,
  },
  errorLabel: {
    color: theme.colors['text-secondary'],
    fontSize: 12,
  },
})
