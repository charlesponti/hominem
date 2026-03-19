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
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
        <Text numberOfLines={1} variant="body" color="foreground" style={styles.title}>
          {item.title}
        </Text>
        <View style={styles.footer}>
          <Text numberOfLines={1} variant="small" color="text-secondary" style={styles.preview}>
            {item.preview}
          </Text>
          <View style={styles.meta}>
            <Text variant="small" color="text-tertiary">
              {formatTimestamp(item.timestamp)}
            </Text>
            <AppIcon
              name={item.kind === 'note' ? 'pen-to-square' : 'comment'}
              size={11}
              color="#9A9A9A"
              style={styles.cornerIcon}
            />
          </View>
        </View>
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
    card: {
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.l_12,
      gap: t.spacing.xs_4,
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.sm_8,
    },
    title: {
      marginTop: 1,
    },
    footer: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: t.spacing.xs_4,
      justifyContent: 'space-between',
    },
    preview: {
      flex: 1,
    },
    meta: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: t.spacing.xs_4,
    },
    cornerIcon: {
      lineHeight: 11,
      opacity: 0.7,
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.74,
    },
  }),
)
