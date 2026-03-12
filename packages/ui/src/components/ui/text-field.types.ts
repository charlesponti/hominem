export type TextFieldType = 'text' | 'email' | 'password' | 'search';

export interface TextFieldBaseProps {
  disabled?: boolean | undefined;
  error?: string | undefined;
  helpText?: string | undefined;
  label?: string | undefined;
}
