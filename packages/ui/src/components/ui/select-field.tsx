import * as React from 'react';

import { cn } from '../../lib/utils';
import type { FieldBaseProps } from './field.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface SelectFieldOption {
  disabled?: boolean;
  label: string;
  value: string;
}

interface SelectFieldProps extends FieldBaseProps {
  defaultValue?: string | undefined;
  disabled?: boolean | undefined;
  options: readonly SelectFieldOption[];
  onValueChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  value?: string | undefined;
}

function SelectField({
  className,
  defaultValue,
  disabled,
  error,
  helpText,
  id: externalId,
  label,
  onValueChange,
  options,
  placeholder,
  required,
  value,
}: SelectFieldProps) {
  const generatedId = React.useId();
  const id = externalId ?? generatedId;
  const descId = `${id}-desc`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : helpText ? descId : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'body-3 font-medium text-text-primary',
            required && "after:ml-0.5 after:text-destructive after:content-['*']",
          )}
        >
          {label}
        </label>
      )}

      <Select
        {...(defaultValue ? { defaultValue } : {})}
        {...(disabled ? { disabled } : {})}
        {...(onValueChange ? { onValueChange } : {})}
        {...(value ? { value } : {})}
      >
        <SelectTrigger
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="w-full"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              {...(option.disabled ? { disabled: option.disabled } : {})}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error ? (
        <p id={errorId} role="alert" className="body-4 text-destructive">
          {error}
        </p>
      ) : helpText ? (
        <p id={descId} className="body-4 text-text-tertiary">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}

export { SelectField, type SelectFieldOption, type SelectFieldProps };
