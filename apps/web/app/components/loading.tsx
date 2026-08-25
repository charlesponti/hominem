import { Loader2 } from 'lucide-react';

import { cn } from '~/lib/utils';

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fullScreen?: boolean;
}

function Loading({
  text = 'Loading...',
  size = 'md',
  className,
  fullScreen = false,
}: LoadingProps) {
  const content = (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex items-center space-x-3">
        <Loader2
          className={cn({
            'size-4': size === 'sm',
            'size-8': size === 'md',
            'size-12': size === 'lg',
            'size-16': size === 'xl',
          })}
        />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingScreen() {
  return (
    <div className="mx-auto flex w-full items-center justify-center py-8">
      <Loading size="xl" fullScreen={false} />
    </div>
  );
}
