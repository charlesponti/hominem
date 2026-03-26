import React, { Component, type ReactNode } from 'react';

import {
  createBoundaryStateFromError,
  resetBoundaryState,
  type BoundaryState,
} from '~/utils/error-boundary/contracts';
import { logError } from '~/utils/error-boundary/log-error';
import { RootErrorFallback } from './root-error-fallback';

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

      return (
        <RootErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
