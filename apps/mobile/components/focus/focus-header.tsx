import { Link } from 'expo-router'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, theme } from '~/theme'
import MindsherpaIcon from '../ui/icon'

export const FocusHeader = React.memo(() => {
  const todaysDate = useMemo(
    () => new Date().toLocaleString('default', { month: 'long', day: 'numeric' }),
    []
  )

  return (
    <View style={[styles.header]}>
      <View style={[styles.topRow]}>
        <View style={[styles.today]}>
          <Text variant="header" color="foreground">
            TODAY
          </Text>
        </View>
        <View style={[styles.iconWrap]}>
          <Link href="/(drawer)/(tabs)/account" style={[styles.iconLink]}>
            <MindsherpaIcon name="user" size={16} />
          </Link>
        </View>
      </View>
      <View style={[styles.bottomRow]}>
        <Text variant="small" color="mutedForeground">
          {todaysDate}
        </Text>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  header: {
    justifyContent: 'space-between',
    marginTop: 91,
    rowGap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  today: { flex: 1, alignItems: 'flex-start' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  iconWrap: {
    backgroundColor: theme.colors.muted,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconLink: {
    padding: 12,
  },
})
