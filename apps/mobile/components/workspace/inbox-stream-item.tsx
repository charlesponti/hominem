import { useRouter } from 'expo-router'
import type { RelativePathString } from 'expo-router'
import React, { useCallback } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { FadeIn } from '~/components/animated/fade-in'
import AppIcon from '~/components/ui/icon'
import { Text, makeStyles } from '~/theme'
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp'

import type { InboxStreamItem as InboxStreamItemModel } from './inbox-stream-items'

interface InboxStreamItemProps {
  item: InboxStreamItemModel
}

export const InboxStreamItem = ({ item }: InboxStreamItemProps) => {
  const styles = useStyles()
  const router = useRouter()

  const onPress = useCallback(() => {
    router.push(item.route as RelativePathString)
  }, [item.route, router])

  return (
    <FadeIn>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
        <View style={styles.leading}>
          <AppIcon
            name={item.kind === 'note' ? 'pen-to-square' : 'comment'}
            size={11}
            color="#9A9A9A"
            style={styles.cornerIcon}
          />
        </View>
        <View style={styles.content}>
          <Text numberOfLines={1} variant="body" color="foreground" style={styles.title}>
            {item.title}
          </Text>
          {item.preview ? (
            <Text numberOfLines={1} variant="small" color="text-secondary" style={styles.preview}>
              {item.preview}
            </Text>
          ) : null}
        </View>
        <Text numberOfLines={1} variant="small" color="text-tertiary" style={styles.timestamp}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </Pressable>
    </FadeIn>
  )
}

function toDate(value: string): Date {
  return parseInboxTimestamp(value)
}

function formatTimestamp(value: string): string {
  const date = toDate(value)

  return `${date.getMonth() + 1}/${date.getDate()}`
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: t.spacing.xs_4,
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.sm_8,
    },
    leading: {
      paddingTop: 2,
    },
    content: {
      flex: 1,
      gap: t.spacing.xs_4,
      minWidth: 0,
    },
    title: {
      color: t.colors.foreground,
    },
    preview: {
      color: t.colors['text-secondary'],
    },
    cornerIcon: {
      lineHeight: 11,
      opacity: 0.55,
      textAlign: 'center',
    },
    timestamp: {
      paddingTop: 1,
      color: t.colors['text-tertiary'],
    },
    pressed: {
      backgroundColor: t.colors['bg-surface'],
    },
  }),
)
