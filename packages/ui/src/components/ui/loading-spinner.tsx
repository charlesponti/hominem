import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-12',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return <div className={cn('border-b-2 border-foreground', sizeClasses[size], className)} />;
}
