import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useInputContext } from '~/components/input/input-context'
import { Text, makeStyles } from '~/theme'

export const SearchContextScreen = () => {
  const styles = useStyles()
  const { message } = useInputContext()

  return (
    <View style={styles.container} testID="search-context-screen">
      <Text variant="caption" color="text-secondary" style={styles.label}>
        Search
      </Text>
      <Text variant="header" color="foreground">
        Search your workspace
      </Text>
      <Text variant="body" color="text-secondary">
        Search uses the same shared corpus as inbox, notes, and chats.
      </Text>
      <View style={styles.queryCard}>
        <Text variant="small" color="text-tertiary">
          Query
        </Text>
        <Text variant="bodyLarge" color="foreground">
          {message.trim().length > 0 ? message : 'Type in the composer to start searching'}
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
    queryCard: {
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.md,
      gap: t.spacing.sm_8,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.m_16,
    },
  }),
)
