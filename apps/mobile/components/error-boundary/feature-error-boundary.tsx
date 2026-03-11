import React, { Component, type ReactNode } from 'react'
import { Pressable, View, StyleSheet } from 'react-native'
import { Text, theme } from '~/theme'
import {
  createBoundaryStateFromError,
  createFeatureFallbackLabel,
  resetBoundaryState,
  type BoundaryState,
} from '~/utils/error-boundary/contracts'
import { logError } from '~/utils/error-boundary/log-error'

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
    logError(error, errorInfo, { feature: this.props.featureName })
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
          <Text variant="body" color="text-tertiary">
            {createFeatureFallbackLabel(this.props.featureName)}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset} accessibilityRole="button">
            <Text variant="small" color="foreground">
              Retry
            </Text>
          </Pressable>
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
    borderColor: theme.colors['border-default'],
    alignItems: 'center',
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
  },
})
