import { FlashList } from '@shopify/flash-list'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { Text, makeStyles } from '~/theme'
import type { ChatWithActivity } from '~/utils/services/chat/session-state'
import type { Note } from '@hominem/hono-rpc/types'

import { InboxStreamItem } from './inbox-stream-item'
import { toInboxStreamItems, type InboxStreamItem as InboxStreamItemModel } from './inbox-stream-items'

interface InboxStreamProps {
  focusItems: Note[]
  sessions: ChatWithActivity[]
}

const keyExtractor = (item: InboxStreamItemModel) => `${item.kind}:${item.id}`

const InboxStreamDivider = () => {
  const styles = useStyles()

  return <View style={styles.divider} />
}

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
        ItemSeparatorComponent={InboxStreamDivider}
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
    divider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: t.spacing.sm_12,
      backgroundColor: t.colors['border-subtle'],
    },
    listContent: {
      paddingHorizontal: t.spacing.sm_12,
      paddingTop: t.spacing.sm_8,
      paddingBottom:
        t.spacing.xl_64 + t.spacing.xl_64 + t.spacing.xl_64 + t.spacing.ml_24 + t.spacing.xs_4,
    },
    empty: {
      alignItems: 'center',
      gap: t.spacing.xs_4,
      marginBottom:
        t.spacing.xl_64 + t.spacing.xl_64 + t.spacing.xl_64 + t.spacing.ml_24 + t.spacing.xs_4,
      marginHorizontal: t.spacing.sm_12,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.l_32,
    },
  }),
)
