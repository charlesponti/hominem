import { fontSizes } from '@hominem/ui/tokens';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { makeStyles, Text } from '~/theme';
import { borderStyle } from '~/theme/styles';

export type ActiveSearch = {
  count: number;
  keyword: string;
};

export const ActiveSearchSummary = React.memo(
  ({ activeSearch, onCloseClick }: { activeSearch: ActiveSearch; onCloseClick: () => void }) => {
    const styles = useStyles();
    return (
      <View style={[styles.container]}>
        <View style={styles.resultCount}>
          <Text variant="body" color="text-primary" style={[styles.searchText]}>
            {activeSearch.count} RESULTS FOR "{activeSearch.keyword.toUpperCase()}"
          </Text>
        </View>
        <View>
          <Pressable onPress={onCloseClick} style={[styles.clearButton]}>
            <Text variant="body" color="foreground">
              CLEAR
            </Text>
          </Pressable>
        </View>
      </View>
    );
  },
);

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    resultCount: {
      flex: 1,
      alignContent: 'center',
    },
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      columnGap: t.spacing.sm_12,
      backgroundColor: t.colors.muted,
      marginHorizontal: t.spacing.xs_4,
      paddingVertical: t.spacing.sm_12,
      paddingHorizontal: t.spacing.m_16,
      ...borderStyle.border,
    },
    searchText: {
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: t.colors.foreground,
      alignItems: 'center',
      paddingVertical: t.spacing.sm_8,
    },
    clearButton: {
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      paddingVertical: t.spacing.sm_8,
      paddingHorizontal: t.spacing.sm_12,
      alignItems: 'center',
    },
  }),
);
