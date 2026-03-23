import type { SessionSource } from '@hominem/chat-services/types'
import { StyleSheet, View } from 'react-native'

import { fontSizes } from '../../tokens'
import { Text } from '../typography/text.native'

interface ContextAnchorProps {
  source: SessionSource
  showTitle?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  note: 'NOTE',
  task: 'TASK',
  task_list: 'LIST',
  tracker: 'TRACKER',
}

export function ContextAnchor({ source, showTitle = true }: ContextAnchorProps) {
  if (source.kind === 'new') {
    return (
      <Text numberOfLines={1} style={styles.primaryTitle}>
        New conversation
      </Text>
    )
  }

  if (source.kind === 'thought') {
    if (!showTitle) {
      return (
        <Text color="text-secondary" numberOfLines={1} style={styles.secondaryLabel}>
          Conversation
        </Text>
      )
    }

    return (
      <Text numberOfLines={1} style={styles.primaryTitle}>
        {source.preview}
      </Text>
    )
  }

  if (!showTitle) {
    return (
      <Text color="text-secondary" numberOfLines={1} style={styles.secondaryLabel}>
        {TYPE_LABELS[source.type] ?? source.type}
      </Text>
    )
  }

  return (
    <View>
      <Text numberOfLines={1} style={styles.primaryTitle}>
        {source.title}
      </Text>
      <Text color="text-secondary" numberOfLines={1} style={styles.secondaryLabel}>
        {TYPE_LABELS[source.type] ?? source.type}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  primaryTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
    maxWidth: 240,
    textAlign: 'center',
  },
  secondaryLabel: {
    fontSize: fontSizes.xs,
    letterSpacing: 0.8,
    opacity: 0.72,
    textTransform: 'uppercase',
  },
})
