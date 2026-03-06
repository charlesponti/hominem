import React, { Component, type ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, theme } from '~/theme'
import {
  createBoundaryStateFromError,
  createFeatureFallbackLabel,
  resetBoundaryState,
  type BoundaryState,
} from '~/utils/error-boundary/contracts'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  featureName?: string
}

type State = BoundaryState

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return createBoundaryStateFromError(error)
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[FeatureErrorBoundary:${this.props.featureName}] Error:`, error, errorInfo)
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
          <Text variant="body" color="mutedForeground">
            {createFeatureFallbackLabel(this.props.featureName)}
          </Text>
          <View style={styles.button} onTouchEnd={this.handleReset}>
            <Text variant="small" color="foreground">
              Retry
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
    padding: 16,
    backgroundColor: theme.colors.muted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
})
