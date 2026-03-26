import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Button } from '~/components/Button';
import { Text, makeStyles } from '~/theme';
import { createFeatureFallbackLabel } from '~/utils/error-boundary/contracts';

interface Props {
  featureName?: string;
  onReset: () => void;
}

export const FeatureErrorFallback = ({ featureName, onReset }: Props) => {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text variant="body" color="text-tertiary">
        {createFeatureFallbackLabel(featureName)}
      </Text>
      <Button
        variant="outline"
        size="sm"
        style={styles.button}
        onPress={onReset}
        title="Retry"
      />
    </View>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      padding: t.spacing.m_16,
      backgroundColor: t.colors.muted,
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      alignItems: 'center',
    },
    button: {
      marginTop: t.spacing.sm_12,
      backgroundColor: t.colors.background,
      borderColor: t.colors['border-default'],
    },
  }),
);