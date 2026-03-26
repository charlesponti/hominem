import React, { Component, type ReactNode } from 'react';

import {
  createBoundaryStateFromError,
  resetBoundaryState,
  type BoundaryState,
} from '~/utils/error-boundary/contracts';
import { logError } from '~/utils/error-boundary/log-error';

import { FeatureErrorFallback } from './feature-error-fallback';

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

      return (
        <FeatureErrorFallback featureName={this.props.featureName} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}
