import * as React from 'react'

import { Field } from './field'
import { Textarea } from './textarea'
import type { TextAreaBaseProps } from './text-area.types'

interface TextAreaProps
  extends React.ComponentProps<'textarea'>,
    TextAreaBaseProps {}

function TextArea({
  className,
  disabled,
  error,
  helpText,
  label,
  ...textareaProps
}: TextAreaProps) {
  if (!label && !helpText && !error) {
    return <Textarea className={className} disabled={disabled} {...textareaProps} />
  }

  return (
    <Field label={label} helpText={helpText} error={error}>
      <Textarea className={className} disabled={disabled} {...textareaProps} />
    </Field>
  )
}

export { TextArea, type TextAreaProps }
