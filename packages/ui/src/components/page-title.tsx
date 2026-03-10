import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

export type PageTitleVariant = 'serif' | 'sans' | 'large';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  variant?: PageTitleVariant;
  className?: string;
}

export function PageTitle({
  title,
  subtitle,
  actions,
  variant = 'serif',
  className,
}: PageTitleProps) {
  const titleClasses = {
    serif: 'heading-1',
    sans: 'heading-3',
    large: 'heading-1',
  };

  return (
    <div className={cn('flex flex-1 justify-between items-center gap-2 group pr-2', className)}>
      <div className="flex flex-col">
        <h1 className={cn('wrap-break-word', titleClasses[variant])}>{title}</h1>
        {subtitle && <p className="body-3 text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageTitle;
