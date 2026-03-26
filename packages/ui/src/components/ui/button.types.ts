import type React from 'react';
import type { PressableProps } from 'react-native';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'destructive'
  | 'ghost'
  | 'link'
  | 'outline'
  | 'secondary';

export type ButtonSize =
  | 'default'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xs'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg';

export interface ButtonBaseProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined;
  onPress?: PressableProps['onPress'];
  isLoading?: boolean | undefined;
  size?: ButtonSize;
  title?: string | undefined;
  type?: 'button' | 'submit' | 'reset' | undefined;
  variant?: ButtonVariant;
}
