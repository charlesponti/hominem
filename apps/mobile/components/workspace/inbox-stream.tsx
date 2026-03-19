import { FlashList } from '@shopify/flash-list'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { Text, makeStyles } from '~/theme'
import type { ChatWithActivity } from '~/utils/services/chat/session-state'
import type { FocusItem } from '~/utils/services/notes/types'

import { InboxStreamItem } from './inbox-stream-item'
import { toInboxStreamItems, type InboxStreamItem as InboxStreamItemModel } from './inbox-stream-items'

interface InboxStreamProps {
  focusItems: FocusItem[]
  sessions: ChatWithActivity[]
}

const keyExtractor = (item: InboxStreamItemModel) => `${item.kind}:${item.id}`

export const InboxStream = ({ focusItems, sessions }: InboxStreamProps) => {
  const styles = useStyles()
  const items = useMemo(() => toInboxStreamItems({ focusItems, sessions }), [focusItems, sessions])

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="bodyLarge" color="foreground">
          Start with a thought
        </Text>
        <Text variant="body" color="text-secondary">
          New notes and conversations will appear here together.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlashList
        contentContainerStyle={styles.listContent}
        data={items}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => <InboxStreamItem item={item} />}
      />
    </View>
  )
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    separator: {
      height: t.spacing.xs_4,
    },
    listContent: {
      paddingHorizontal: t.spacing.sm_12,
      paddingTop: t.spacing.xs_4,
      paddingBottom: 220,
    },
    empty: {
      borderRadius: t.borderRadii.l_12,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      gap: t.spacing.sm_8,
      marginBottom: 220,
      marginHorizontal: t.spacing.sm_12,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.xl_48,
    },
  }),
)
