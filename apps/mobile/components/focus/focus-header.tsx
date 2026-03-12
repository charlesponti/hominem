import { Link } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeStyles, Text } from '~/theme';

import AppIcon from '../ui/icon';

export const FocusHeader = React.memo(() => {
  const styles = useStyles();
  const todaysDate = useMemo(
    () => new Date().toLocaleString('default', { month: 'long', day: 'numeric' }),
    [],
  );

  return (
    <View style={[styles.header]}>
      <View style={[styles.topRow]}>
        <View style={[styles.today]}>
          <Text variant="header" color="foreground">
            TODAY
          </Text>
        </View>
        <View style={[styles.iconWrap]}>
          <Link
            href={'/(protected)/(tabs)/account' as RelativePathString}
            style={[styles.iconLink]}
          >
            <AppIcon name="user" size={16} />
          </Link>
        </View>
      </View>
      <View style={[styles.bottomRow]}>
        <Text variant="small" color="text-tertiary">
          {todaysDate}
        </Text>
      </View>
    </View>
  );
});

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    header: {
      justifyContent: 'space-between',
      marginTop: 91, // token-audit-ignore top offset is screen-specific
      rowGap: t.spacing.xs_4,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.spacing.m_16,
    },
    today: { flex: 1, alignItems: 'flex-start' },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingHorizontal: t.spacing.m_16,
    },
    iconWrap: {
      backgroundColor: t.colors.muted,
      borderRadius: 99 /* full radius for circular icon */,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    iconLink: {
      padding: t.spacing.sm_12,
    },
  }),
);
