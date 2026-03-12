import { Link } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeStyles, Text, theme } from '~/theme';

import AppIcon from './ui/icon';

export const ViewHeader = ({ children }: PropsWithChildren) => {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <Link href={'/(protected)/(tabs)/focus' as RelativePathString}>
          <View style={styles.backLink}>
            <AppIcon name="arrow-left" size={26} color={theme.colors.foreground} />
            <Text variant="bodyLarge">Today</Text>
          </View>
        </Link>
      </View>
      {children}
    </View>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      overflow: 'hidden',
      marginTop: 50, // token-audit-ignore header offset is route-specific
    },
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: t.spacing.sm_12,
    },
    navbar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.m_16,
      // opacity: 0.8,
      // backgroundColor: t.colors['emphasis-faint'],
    },
    gradient: {
      height: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: t.spacing.m_16,
      marginTop: t.spacing.ml_24,
    },
  }),
);
