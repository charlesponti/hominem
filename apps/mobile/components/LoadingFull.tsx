import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Box, makeStyles, theme } from '~/theme';

export const LoadingFull = ({ children }: PropsWithChildren) => {
  return (
    <LoadingContainer>
      {children}
      <ActivityIndicator size="large" color={theme.colors.foreground} />
    </LoadingContainer>
  );
};

export const LoadingContainer = ({ children }: PropsWithChildren) => {
  const styles = useStyles();
  return <Box style={styles.loading}>{children}</Box>;
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: t.spacing.ml_24,
      paddingVertical: t.spacing.xl_48,
      rowGap: t.spacing.ml_24,
      backgroundColor: t.colors.background,
    },
  }),
);
