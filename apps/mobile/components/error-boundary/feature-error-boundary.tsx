import React, { Component, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { Button } from '~/components/Button';
import { Text, makeStyles } from '~/theme';
import {
  createBoundaryStateFromError,
  createFeatureFallbackLabel,
  resetBoundaryState,
  type BoundaryState,
} from '~/utils/error-boundary/contracts';
import { logError } from '~/utils/error-boundary/log-error';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  featureName?: string;
}

type State = BoundaryState;

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return createBoundaryStateFromError(error);
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, errorInfo, { feature: this.props.featureName });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState(resetBoundaryState());
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const styles = useStyles();
      return (
        <View style={styles.container}>
          <Text variant="body" color="text-tertiary">
            {createFeatureFallbackLabel(this.props.featureName)}
          </Text>
          <Button
            variant="outline"
            size="sm"
            style={styles.button}
            onPress={this.handleReset}
            title="Retry"
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      padding: t.spacing.m_16,
      backgroundColor: t.colors.muted,
      borderRadius: t.borderRadii.sm_6,
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
