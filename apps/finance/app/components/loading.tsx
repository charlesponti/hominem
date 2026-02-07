import { Loader2 } from 'lucide-react';

import { cn } from '~/lib/utils';

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

export function Loading({
  text = 'Loading...',
  size = 'md',
  className,
  fullScreen = false,
}: LoadingProps) {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-8',
    lg: 'size-12',
  };

  const content = (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex items-center space-x-3">
        <Loader2 className={cn(sizeClasses[size])} />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center border border-border/30 z-50">
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center max-h-[300px] mx-auto w-full">
      <Loading size="lg" fullScreen={false} />
    </div>
  );
}
