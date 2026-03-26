import * as React from 'react';

import { cn } from '../../lib/utils';

interface NumberInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  maxLength?: number;
  error?: boolean;
  success?: boolean;
}

/**
 * NumberInput — numeric-only input field with optional error and success states.
 * Automatically strips non-numeric characters.
 *
 * @example
 * <NumberInput value={code} onChange={(e) => setCode(e.target.value)} />
 * <NumberInput maxLength={6} error={hasError} success={isValid} />
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, maxLength, error, success, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '');
      e.target.value = maxLength ? value.slice(0, maxLength) : value;
      props.onChange?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const paste = e.clipboardData.getData('text').replace(/\D/g, '');
      if (maxLength && paste.length > maxLength) {
        e.preventDefault();
        const input = e.target as HTMLInputElement;
        input.value = paste.slice(0, maxLength);
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        disabled={disabled || success}
        readOnly={success}
        onChange={handleChange}
        onPaste={handlePaste}
        maxLength={maxLength}
        className={cn(
          'placeholder:text-text-tertiary selection:bg-accent selection:text-accent-foreground',
          'h-10 w-full rounded-md border bg-surface px-3 py-2 text-base',
          'transition-[color,box-shadow] duration-120 outline-none',
          'focus-visible:shadow-[0_0_0_2px_var(--color-bg-elevated),0_0_0_4px_var(--color-accent)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          success && 'border-accent bg-accent/5',
          !success && !error && 'border-border-default focus-visible:border-border-focus',
          error &&
            'border-destructive focus-visible:shadow-[0_0_0_2px_var(--color-bg-elevated),0_0_0_4px_var(--color-destructive)]',
          className,
        )}
        {...props}
      />
    );
  },
);

NumberInput.displayName = 'NumberInput';

export { NumberInput, type NumberInputProps };
