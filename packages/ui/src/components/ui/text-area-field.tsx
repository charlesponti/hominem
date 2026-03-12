import * as React from 'react';

import { Field } from './field';
import { Textarea } from './textarea';

interface TextAreaFieldProps extends React.ComponentProps<'textarea'> {
  label?: string | undefined;
  helpText?: string | undefined;
  error?: string | undefined;
}

/**
 * TextAreaField — compound textarea with label, helper text, and error state.
 * Replaces raw `<textarea>` + `<label>` + error span patterns in feature code.
 *
 * @example
 * <TextAreaField label="Notes" helpText="Markdown supported" />
 * <TextAreaField label="Bio" error={errors.bio?.message} rows={4} />
 */
function TextAreaField({
  label,
  helpText,
  error,
  className,
  ...textareaProps
}: TextAreaFieldProps) {
  if (!label && !helpText && !error) {
    return <Textarea className={className} {...textareaProps} />;
  }

  return (
    <Field label={label} helpText={helpText} error={error}>
      <Textarea className={className} {...textareaProps} />
    </Field>
  );
}

export { TextAreaField, type TextAreaFieldProps };
