import React, { Component, type ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, theme } from '~/theme'
import {
  createBoundaryStateFromError,
  createRootFallbackMessage,
  resetBoundaryState,
  type BoundaryState,
} from '~/utils/error-boundary/contracts'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

type State = BoundaryState

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return createBoundaryStateFromError(error)
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary] Uncaught error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState(resetBoundaryState())
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <View style={styles.container}>
          <Text variant="header" color="foreground">
            Something went wrong
          </Text>
          <Text variant="body" color="mutedForeground" style={styles.message}>
            {createRootFallbackMessage(this.state.error)}
          </Text>
          <View style={styles.button} onTouchEnd={this.handleReset}>
            <Text variant="label" color="white">
              Try Again
            </Text>
          </View>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors['fg-primary'],
    borderRadius: 8,
  },
})
