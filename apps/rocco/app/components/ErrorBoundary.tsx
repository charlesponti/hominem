import { PageTitle } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import {
  AlertCircle,
  ArrowLeft,
  Bug,
  ChevronDown,
  Home,
  List,
  LogIn,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { useState } from 'react';
import { isRouteErrorResponse, useNavigate } from 'react-router';

import Header from './header';

interface ErrorBoundaryProps {
  error: unknown;
}

interface ErrorDetails {
  message: string;
  details: string;
  icon: React.ReactNode;
  iconColor: string;
  suggestions: string[];
  showAuth?: boolean;
}

function getErrorDetails(error: unknown): ErrorDetails {
  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 404:
        return {
          message: 'Page Not Found',
          details: "The page you're looking for doesn't exist or has been moved.",
          icon: <AlertCircle className="size-20 sm:size-24" />,
          iconColor: 'text-foreground/70',
          suggestions: ['Check the URL for typos', 'Return to the home page', 'Browse your lists'],
        };
      case 401:
        return {
          message: 'Authentication Required',
          details: 'You need to sign in to access this page.',
          icon: <LogIn className="size-20 sm:size-24" />,
          iconColor: 'text-[var(--color-warning)]/70',
          suggestions: ['Sign in with your Google account', 'Contact support if you need help'],
          showAuth: true,
        };
      case 403:
        return {
          message: 'Access Denied',
          details: "You don't have permission to access this resource.",
          icon: <ShieldAlert className="size-20 sm:size-24" />,
          iconColor: 'text-destructive/70',
          suggestions: [
            'Check if you have the right permissions',
            'Contact the list owner for access',
            'Return to your lists',
          ],
        };
      case 500:
        return {
          message: 'Server Error',
          details: "Something went wrong on our end. We're working to fix it.",
          icon: <ServerCrash className="size-20 sm:size-24" />,
          iconColor: 'text-destructive/70',
          suggestions: [
            'Try refreshing the page',
            'Wait a few minutes and try again',
            'Contact support if the issue persists',
          ],
        };
      case 503:
        return {
          message: 'Service Unavailable',
          details: 'The service is temporarily unavailable. Please try again later.',
          icon: <WifiOff className="size-20 sm:size-24" />,
          iconColor: 'text-[var(--color-warning)]/70',
          suggestions: [
            'Check your internet connection',
            'Try again in a few minutes',
            'Check our status page',
          ],
        };
      default:
        return {
          message: `Error ${error.status}`,
          details: error.statusText || 'An unexpected error occurred.',
          icon: <AlertCircle className="size-20 sm:size-24" />,
          iconColor: 'text-destructive/70',
          suggestions: ['Try refreshing the page', 'Go back to the previous page', 'Return home'],
        };
    }
  }

  // Handle regular Error objects
  if (error instanceof Error) {
    console.error('ErrorBoundary caught an error:', error);
    return {
      message: 'Something Went Wrong',
      details:
        import.meta.env.DEV || error.message.length < 100
          ? error.message
          : 'An unexpected error occurred. Please try again.',
      icon: <Bug className="size-20 sm:size-24" />,
      iconColor: 'text-muted-foreground',
      suggestions: [
        'Try refreshing the page',
        'Clear your browser cache',
        'Contact support if the issue persists',
      ],
    };
  }

  // Fallback for unknown errors
  console.error('ErrorBoundary caught an error:', error);
  return {
    message: 'Unexpected Error',
    details: 'An unexpected error occurred. Please try again.',
    icon: <AlertCircle className="size-20 sm:size-24" />,
    iconColor: 'text-muted-foreground/70',
    suggestions: ['Try refreshing the page', 'Return to the home page', 'Contact support'],
  };
}

export default function ErrorBoundary({ error }: ErrorBoundaryProps) {
  const navigate = useNavigate();
  const [showStack, setShowStack] = useState(false);
  const errorDetails = getErrorDetails(error);
  const stack = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center">
      <div className="h-full w-full flex flex-col sm:max-w-3xl px-2">
        <Header />
        <main className="pt-16 p-4 container mx-auto">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto py-8">
            {/* Error Icon */}
            <div className={`mb-6 ${errorDetails.iconColor}`}>{errorDetails.icon}</div>

            {/* Error Message */}
            <div className="mb-4">
              <PageTitle title={errorDetails.message} />
            </div>

            {/* Error Details */}
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-md font-light leading-relaxed">
              {errorDetails.details}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-8">
              <Button onClick={handleRetry} size="lg" className="flex items-center gap-2">
                <RefreshCw className="size-4" />
                Retry
              </Button>
              <Button
                onClick={handleGoBack}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="size-4" />
                Go Back
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                <Home className="size-4" />
                Home
              </Button>
            </div>

            {/* Suggestions */}
            {errorDetails.suggestions.length > 0 && (
              <div className="w-full border border-border/30 p-6 mb-6 text-left">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  What you can try:
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {errorDetails.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Helpful Links */}
            <div className="pt-6 border-t border-border/50 w-full">
              <p className="text-sm text-muted-foreground mb-4 font-light">Quick Links</p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-primary hover:text-primary/80 flex items-center gap-1.5"
                >
                  <Home className="size-4" />
                  Explore Places
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/lists')}
                  className="text-primary hover:text-primary/80 flex items-center gap-1.5"
                >
                  <List className="size-4" />
                  My Lists
                </button>
              </div>
            </div>

            {/* Developer Stack Trace */}
            {stack && (
              <div className="w-full mt-8">
                <button
                  type="button"
                  onClick={() => setShowStack(!showStack)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
                >
                  <Bug className="size-4" />
                  <span>Developer Info</span>
                  <ChevronDown className={`size-4 ${showStack ? 'rotate-180' : ''}`} />
                </button>
                {showStack && (
                  <div className="overflow-hidden">
                    <pre className="w-full p-4 overflow-x-auto border border-border text-xs text-left">
                      <code className="text-foreground/80">{stack}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
