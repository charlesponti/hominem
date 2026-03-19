import { Pressable, StyleSheet, Text, View } from 'react-native'

import { theme } from '~/theme'

import type { MobileHyperFormAttachment } from './mobile-hyper-form-state'

interface MobileHyperFormAttachmentsProps {
  attachments: MobileHyperFormAttachment[]
  onRemoveAttachment: (attachmentId: string) => void
}

export function MobileHyperFormAttachments({
  attachments,
  onRemoveAttachment,
}: MobileHyperFormAttachmentsProps) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <View style={styles.attachments} testID="mobile-hyper-form-attachments">
      {attachments.map((attachment) => (
        <Pressable
          key={attachment.id}
          onPress={() => onRemoveAttachment(attachment.id)}
          style={styles.attachmentChip}
          testID={`mobile-hyper-form-attachment-${attachment.id}`}
        >
          <Text style={styles.attachmentLabel}>{attachment.name}</Text>
        </Pressable>
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    paddingHorizontal: theme.spacing.sm_8,
    paddingVertical: theme.spacing.xs_4,
  },
  attachmentLabel: {
    color: theme.colors.foreground,
    fontSize: 12,
  },
})
