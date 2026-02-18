import React from 'react'
import { StyleSheet, View } from 'react-native'

import MindsherpaIcon from '~/components/ui/icon'
import { Text, theme } from '~/theme'

export default function FocusInsightsSheet() {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text variant="cardHeader">Liquid focus rituals</Text>
        <Text variant="body" color="grayDark">
          A live summary of how your mind is trending. Every tap is tracked with native
          transitions, so the sheet feels as smooth as the rest of the experience.
        </Text>
      </View>
      <View style={styles.section}>
        <Text variant="label">Live metrics</Text>
        <View style={styles.metricRow}>
          <MindsherpaIcon name="sparkles" size={18} color={theme.colors.yellow} />
          <Text variant="bodyLarge">Energy: High</Text>
        </View>
        <View style={styles.metricRow}>
          <MindsherpaIcon name="bolt" size={18} color={theme.colors.primary} />
          <Text variant="bodyLarge">Momentum: 4 streaks</Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text variant="label">Sherpa reminder</Text>
        <Text variant="body" color="grayDark">
          Tap the bottom accessory at any time to hop back into the Sherpa conversation or
          minimize the tab bar with a scroll to keep this sheet in view.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    rowGap: 18,
    backgroundColor: theme.colors.white,
  },
  section: {
    rowGap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    columnGap: 8,
    alignItems: 'center',
  },
})
