import * as React from 'react';

import { Field } from './field';
import { Input } from './input';
import type { TextFieldBaseProps, TextFieldType } from './text-field.types';

interface TextFieldProps extends Omit<React.ComponentProps<'input'>, 'type'>, TextFieldBaseProps {
  type?: TextFieldType | undefined;
}

/**
 * Input bundled with label, helper text, and error state — swap in for a
 * raw `<input>` + `<label>` + error span combo.
 */
function TextField({
  id,
  label,
  helpText,
  error,
  className,
  disabled,
  type = 'text',
  ...inputProps
}: TextFieldProps) {
  if (!label && !helpText && !error) {
    return <Input className={className} disabled={disabled} type={type} {...inputProps} />;
  }

  return (
    <Field id={id} label={label} helpText={helpText} error={error}>
      <Input className={className} disabled={disabled} type={type} {...inputProps} />
    </Field>
  );
}

export { TextField, type TextFieldProps };
