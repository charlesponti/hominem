import type { GapToken } from './stack.types';

export type InlineAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
export type InlineJustify = 'start' | 'center' | 'end' | 'between' | 'around';

export interface InlineBaseProps {
  align?: InlineAlign | undefined;
  gap?: GapToken | undefined;
  justify?: InlineJustify | undefined;
  wrap?: boolean | undefined;
}
