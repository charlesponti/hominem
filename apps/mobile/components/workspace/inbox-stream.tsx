import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import React, { memo, useCallback, useMemo } from 'react'
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
const InboxStreamDivider = memo(() => {
  const styles = useStyles()

  return <View style={styles.divider} />
})

InboxStreamDivider.displayName = 'InboxStreamDivider'

const RenderInboxStreamItem = memo(({ item }: { item: InboxStreamItemModel }) => {
  return <InboxStreamItem item={item} />
})

RenderInboxStreamItem.displayName = 'RenderInboxStreamItem'

export const InboxStream = ({ focusItems, sessions }: InboxStreamProps) => {
  const styles = useStyles()
  const items = useMemo(() => toInboxStreamItems({ focusItems, sessions }), [focusItems, sessions])
  const renderItem = useCallback<ListRenderItem<InboxStreamItemModel>>(({ item }) => {
    return <RenderInboxStreamItem item={item} />
  }, [])

  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.empty}>
          <Text variant="bodyLarge" color="foreground">
            Start with a thought
          </Text>
          <Text variant="body" color="text-secondary">
            New notes and conversations will appear here together.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionShell}>
        <FlashList
          contentContainerStyle={styles.listContent}
          data={items}
          ItemSeparatorComponent={InboxStreamDivider}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListFooterComponent={<View style={styles.sectionFooter} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  )
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: t.spacing.sm_12,
      paddingTop: t.spacing.sm_8,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: t.spacing.m_16 + 34,
      marginRight: t.spacing.m_16 + t.spacing.sm_8,
      backgroundColor: t.colors['border-subtle'],
    },
    sectionShell: {
      backgroundColor: t.colors['bg-base'],
      borderColor: t.colors['border-default'],
      borderCurve: 'continuous',
      borderRadius: 22,
      borderWidth: 1,
      flex: 1,
      overflow: 'hidden',
    },
    listContent: {
      paddingTop: 0,
      paddingBottom:
        t.spacing.xl_64 + t.spacing.xl_64 + t.spacing.ml_24 + t.spacing.sm_12,
    },
    sectionFooter: {
      height: 2,
    },
    emptyWrap: {
      marginBottom:
        t.spacing.xl_64 + t.spacing.xl_64 + t.spacing.xl_64 + t.spacing.ml_24 + t.spacing.xs_4,
      marginHorizontal: t.spacing.m_16,
    },
    empty: {
      alignItems: 'center',
      backgroundColor: t.colors['bg-base'],
      borderCurve: 'continuous',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      gap: t.spacing.xs_4,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.l_32,
    },
  }),
)
