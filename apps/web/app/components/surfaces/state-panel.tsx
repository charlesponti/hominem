import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

interface StatePanelProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  layout?: 'centered' | 'inline';
  variant?: 'default' | 'dashed';
}

export function StatePanel({
  icon,
  title,
  description,
  actions,
  children,
  layout = 'centered',
  variant = 'default',
}: StatePanelProps) {
  const centered = layout === 'centered';

  return (
    <div
      className={cn(
        'rounded-3xl border-subtle bg-surface p-5',
        centered
          ? 'flex min-h-80 flex-col items-center justify-center text-center'
          : 'flex flex-col gap-3',
        variant === 'dashed' && 'border-2 border-dashed',
      )}
    >
      {icon ? (
        <div className={cn(centered ? 'mb-4' : 'mb-1', 'text-text-tertiary')}>{icon}</div>
      ) : null}
      {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
      {description ? (
        <p className={cn('text-sm text-text-secondary', centered && 'max-w-[32ch]')}>
          {description}
        </p>
      ) : null}
      {children ? <div className={cn(centered ? 'mt-1' : '')}>{children}</div> : null}
      {actions ? <div className={cn(centered ? 'mt-4' : 'mt-2')}>{actions}</div> : null}
    </div>
  );
}
