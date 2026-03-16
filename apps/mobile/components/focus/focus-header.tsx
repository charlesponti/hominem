import { Link } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { makeStyles, Text } from '~/theme';

import AppIcon from '../ui/icon';

interface FocusHeaderProps {
  sessionCount: number;
  noteCount: number;
}

export const FocusHeader = React.memo(({ sessionCount, noteCount }: FocusHeaderProps) => {
  const styles = useStyles();

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text variant="caption" color="text-tertiary" style={styles.eyebrow}>
            NOTES
          </Text>
          <Text variant="header" color="foreground">
            One place for raw thoughts and live conversations.
          </Text>
          <Text variant="body" color="text-secondary">
            Capture quickly, resume context nearby, and keep the rest of your writing in one calm
            stream.
          </Text>
        </View>
        <View style={styles.iconWrap}>
          <Link href={'/(protected)/(tabs)/account' as RelativePathString} style={styles.iconLink}>
            <AppIcon name="user" size={16} />
          </Link>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text variant="caption" color="text-tertiary" style={styles.statLabel}>
            Sessions
          </Text>
          <Text variant="cardHeader" color="foreground">
            {sessionCount}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text variant="caption" color="text-tertiary" style={styles.statLabel}>
            Notes
          </Text>
          <Text variant="cardHeader" color="foreground">
            {noteCount}
          </Text>
        </View>
      </View>
    </View>
  );
});

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    header: {
      marginTop: 91, // token-audit-ignore top offset is screen-specific
      rowGap: t.spacing.m_16,
      paddingHorizontal: t.spacing.m_16,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      columnGap: t.spacing.sm_12,
    },
    copy: {
      flex: 1,
      rowGap: t.spacing.sm_8,
    },
    eyebrow: {
      letterSpacing: 1.2,
    },
    statsRow: {
      flexDirection: 'row',
      columnGap: t.spacing.sm_12,
    },
    statCard: {
      flex: 1,
      rowGap: t.spacing.xs_4,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.xl_20,
      backgroundColor: t.colors.background,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
    },
    statLabel: {
      letterSpacing: 1,
    },
    iconWrap: {
      backgroundColor: t.colors.background,
      borderRadius: 99 /* full radius for circular icon */,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    iconLink: {
      padding: t.spacing.sm_12,
    },
  }),
);
