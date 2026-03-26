import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Button } from '~/components/Button';
import { Text, makeStyles } from '~/theme';
import { createRootFallbackMessage } from '~/utils/error-boundary/contracts';

interface Props {
  error: Error | null;
  onReset: () => void;
}

export const RootErrorFallback = ({ error, onReset }: Props) => {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text variant="header" color="foreground">
        Something went wrong
      </Text>
      <Text variant="body" color="text-tertiary" style={styles.message}>
        {createRootFallbackMessage(error)}
      </Text>
      <Button
        variant="primary"
        style={styles.button}
        onPress={onReset}
        title="Try Again"
      />
    </View>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.colors.background,
      padding: t.spacing.ml_24,
    },
    message: {
      marginTop: t.spacing.sm_12,
      textAlign: 'center',
      maxWidth: 300,
    },
    button: {
      marginTop: t.spacing.ml_24,
      backgroundColor: t.colors['text-primary'],
    },
  }),
);