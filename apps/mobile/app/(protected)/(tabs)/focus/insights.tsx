import React from 'react';
import { StyleSheet, View } from 'react-native';

import AppIcon from '~/components/ui/icon';
import { Text, theme, makeStyles } from '~/theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: t.spacing.ml_24,
      rowGap: t.spacing.m_16,
      backgroundColor: t.colors.background,
    },
    section: {
      rowGap: t.spacing.sm_8,
    },
    metricRow: {
      flexDirection: 'row',
      columnGap: t.spacing.sm_8,
      alignItems: 'center',
    },
  }),
);

export default function FocusInsightsSheet() {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text variant="cardHeader" color="foreground">
          FOCUS INSIGHTS
        </Text>
        <Text variant="body" color="text-secondary">
          LIVE SUMMARY OF FOCUS STATE.
        </Text>
      </View>
      <View style={styles.section}>
        <Text variant="label" color="text-tertiary">
          LIVE METRICS
        </Text>
        <View style={styles.metricRow}>
          <AppIcon name="sparkles" size={18} color={theme.colors.foreground} />
          <Text variant="bodyLarge" color="foreground">
            ENERGY: HIGH
          </Text>
        </View>
        <View style={styles.metricRow}>
          <AppIcon name="bolt" size={18} color={theme.colors.foreground} />
          <Text variant="bodyLarge" color="foreground">
            MOMENTUM: 4 STREAKS
          </Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text variant="label" color="text-tertiary">
          ASSISTANT REMINDER
        </Text>
        <Text variant="body" color="text-secondary">
          OPEN CHAT TO GENERATE NEW FOCUS CYCLES.
        </Text>
      </View>
    </View>
  );
}
