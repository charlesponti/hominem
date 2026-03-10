import { cn } from '../../lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Use `narrow` only for focused single-column content like forms or detail views.
   * The default (`standard`) matches the AppLayout canonical constraint (max-w-5xl).
   * Never set this to bypass the layout system — if you think you need a wider container,
   * the content belongs outside PageContainer entirely.
   */
  width?: 'narrow' | 'standard';
}

export function PageContainer({ children, className, width = 'standard' }: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full',
        width === 'narrow' && 'max-w-2xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
