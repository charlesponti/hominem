import React, { Component, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { Button } from '~/components/Button';
import { Text, makeStyles } from '~/theme';
import {
  createBoundaryStateFromError,
  createRootFallbackMessage,
  resetBoundaryState,
  type BoundaryState,
} from '~/utils/error-boundary/contracts';
import { logError } from '~/utils/error-boundary/log-error';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

type State = BoundaryState;

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return createBoundaryStateFromError(error);
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, errorInfo);
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
          <Text variant="header" color="foreground">
            Something went wrong
          </Text>
          <Text variant="body" color="text-tertiary" style={styles.message}>
            {createRootFallbackMessage(this.state.error)}
          </Text>
          <Button
            variant="primary"
            style={styles.button}
            onPress={this.handleReset}
            title="Try Again"
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
