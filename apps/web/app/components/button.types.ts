export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'destructive'
  | 'icon'
  | 'ghost'
  | 'link'
  | 'outline'
  | 'secondary';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xs' | 'icon';

export interface ButtonBaseProps {
  isLoading?: boolean | undefined;
  fullWidth?: boolean | undefined;
  size?: ButtonSize;
  title?: string | undefined;
  variant?: ButtonVariant;
}
