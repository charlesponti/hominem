import * as React from 'react';

import { cn } from '../lib/utils';
import type { FieldBaseProps } from './field.types';

interface FieldProps extends FieldBaseProps {
  children: React.ReactNode;
}

/**
 * Field — standalone label + control + helper/error slot.
 * Wires label ↔ control association automatically via a generated id.
 * Does NOT require react-hook-form — works with any controlled or uncontrolled input.
 *
 * @example
 * <Field label="Email" error={errors.email}>
 *   <Input type="email" />
 * </Field>
 */
function Field({ label, helpText, error, required, children, id: externalId }: FieldProps) {
  const generatedId = React.useId();
  const id = externalId ?? generatedId;
  const descId = `${id}-desc`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'body-3 font-medium text-text-primary',
            required && "after:content-['*'] after:ml-0.5 after:text-destructive",
          )}
        >
          {label}
        </label>
      )}

      {/* Clone child to inject id and aria attributes */}
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
            {
              id,
              'aria-describedby': error ? errorId : helpText ? descId : undefined,
              'aria-invalid': error ? true : undefined,
            } as React.HTMLAttributes<HTMLElement>,
          )
        : children}

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

export { Field, type FieldProps };
