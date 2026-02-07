import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

const alertVariants = cva('relative w-full border p-4', {
  variants: {
    variant: {
      default: 'text-foreground',
      destructive: 'text-destructive border-destructive/50 [&>svg]:text-destructive',
      success: 'bg-muted border-border text-foreground [&>svg]:text-foreground',
      warning:
        'border-[var(--color-warning)]/50 text-[var(--color-warning)] [&>svg]:text-[var(--color-warning)]',
      info: 'bg-muted border-border text-foreground [&>svg]:text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  type?: AlertType | undefined;
  dismissible?: boolean | undefined;
  onDismiss?: (() => void) | undefined;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, type, dismissible = false, onDismiss, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true);

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    // Determine variant from type if provided
    const alertVariant =
      variant ||
      (type === 'error'
        ? 'destructive'
        : type === 'success'
          ? 'success'
          : type === 'warning'
            ? 'warning'
            : type === 'info'
              ? 'info'
              : 'default');

    const getIcon = () => {
      switch (type) {
        case 'success':
          return <CheckCircle size={20} />;
        case 'error':
          return <XCircle size={20} />;
        case 'warning':
          return <AlertCircle size={20} />;
        case 'info':
          return <Info size={20} />;
        default:
          return null;
      }
    };

    const getIconColor = () => {
      switch (type) {
        case 'success':
          return 'text-foreground';
        case 'error':
          return 'text-destructive';
        case 'warning':
          return 'text-[var(--color-warning)]';
        case 'info':
          return 'text-foreground';
        default:
          return '';
      }
    };

    if (!isVisible) {
      return null;
    }

    const icon = getIcon();
    const iconColor = getIconColor();

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant: alertVariant }), className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon && <div className={cn('shrink-0', iconColor)}>{icon}</div>}
          <div className="flex-1 text-sm leading-relaxed">{children}</div>
          {dismissible && (
            <button
              type="button"
              className="shrink-0 p-1 opacity-70 hover:opacity-100 focus:outline-none"
              onClick={handleDismiss}
              aria-label="Dismiss alert"
            >
              <XCircle size={16} className={cn('text-current', iconColor)} />
            </button>
          )}
        </div>
      </div>
    );
  },
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-mono uppercase tracking-tight', className)} {...props} />
  ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription, AlertTitle };
