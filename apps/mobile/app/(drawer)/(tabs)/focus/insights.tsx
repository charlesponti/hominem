import React from 'react';
import { StyleSheet, View } from 'react-native';

import MindsherpaIcon from '~/components/ui/icon';
import { Text, theme } from '~/theme';

export default function FocusInsightsSheet() {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text variant="cardHeader" color="foreground">
          FOCUS INSIGHTS
        </Text>
        <Text variant="body" color="secondaryForeground">
          LIVE SUMMARY OF FOCUS STATE.
        </Text>
      </View>
      <View style={styles.section}>
        <Text variant="label" color="mutedForeground">
          LIVE METRICS
        </Text>
        <View style={styles.metricRow}>
          <MindsherpaIcon name="sparkles" size={18} color={theme.colors.foreground} />
          <Text variant="bodyLarge" color="foreground">
            ENERGY: HIGH
          </Text>
        </View>
        <View style={styles.metricRow}>
          <MindsherpaIcon name="bolt" size={18} color={theme.colors.foreground} />
          <Text variant="bodyLarge" color="foreground">
            MOMENTUM: 4 STREAKS
          </Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text variant="label" color="mutedForeground">
          SHERPA REMINDER
        </Text>
        <Text variant="body" color="secondaryForeground">
          OPEN SHERPA TO GENERATE NEW FOCUS CYCLES.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    rowGap: 18,
    backgroundColor: theme.colors.background,
  },
  section: {
    rowGap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    columnGap: 8,
    alignItems: 'center',
  },
});
