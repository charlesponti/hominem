import type { ReactNode } from 'react';

export type GapToken = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface StackBaseProps {
  divider?: ReactNode;
  gap?: GapToken | undefined;
}
