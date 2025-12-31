import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/utils'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 backdrop-blur-sm animate-in fade-in duration-300',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'text-destructive border-destructive/50 dark:border-destructive [&>svg]:text-destructive',
        success:
          'bg-green-50/50 border-green-200/50 text-green-900 dark:bg-green-950/50 dark:border-green-800/50 dark:text-green-100',
        warning:
          'bg-yellow-50/50 border-yellow-200/50 text-yellow-900 dark:bg-yellow-950/50 dark:border-yellow-800/50 dark:text-yellow-100',
        info: 'bg-blue-50/50 border-blue-200/50 text-blue-900 dark:bg-blue-950/50 dark:border-blue-800/50 dark:text-blue-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  type?: AlertType
  dismissible?: boolean
  onDismiss?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, type, dismissible = false, onDismiss, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true)

    const handleDismiss = () => {
      setIsVisible(false)
      onDismiss?.()
    }

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
              : 'default')

    const getIcon = () => {
      switch (type) {
        case 'success':
          return <CheckCircle size={20} />
        case 'error':
          return <XCircle size={20} />
        case 'warning':
          return <AlertCircle size={20} />
        case 'info':
          return <Info size={20} />
        default:
          return null
      }
    }

    const getIconColor = () => {
      switch (type) {
        case 'success':
          return 'text-green-600 dark:text-green-400'
        case 'error':
          return 'text-destructive'
        case 'warning':
          return 'text-yellow-600 dark:text-yellow-400'
        case 'info':
          return 'text-blue-600 dark:text-blue-400'
        default:
          return ''
      }
    }

    if (!isVisible) {
      return null
    }

    const icon = getIcon()
    const iconColor = getIconColor()

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
              className="shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
              onClick={handleDismiss}
              aria-label="Dismiss alert"
            >
              <XCircle size={16} className={cn('text-current', iconColor)} />
            </button>
          )}
        </div>
      </div>
    )
  }
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription, AlertTitle }
