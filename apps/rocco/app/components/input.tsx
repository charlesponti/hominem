import { AlertCircle } from 'lucide-react'
import { forwardRef, type SyntheticEvent } from 'react'
import { cn } from '~/lib/utils'
import styles from './input.module.css'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  errorMessage?: string
  leftAccessory?: React.ReactNode
  rightAccessory?: React.ReactNode
  hideLabel?: boolean
}

const Input = forwardRef<HTMLInputElement, Props>(
  (
    {
      label,
      helperText,
      errorMessage,
      leftAccessory,
      rightAccessory,
      className = '',
      hideLabel = false,
      ...rest
    },
    ref
  ) => {
    function handleClick(e: SyntheticEvent<HTMLButtonElement>) {
      const inputEl = (e.currentTarget as HTMLButtonElement).querySelector('input')
      inputEl?.focus()
    }

    const hasError = Boolean(errorMessage)
    const hasLeftAccessory = Boolean(leftAccessory)
    const hasRightAccessory = Boolean(rightAccessory)
    const inputId = rest.id

    return (
      <button
        type="button"
        className={styles.container}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e)
          }
        }}
        aria-label="Click to focus input"
      >
        {label && !hideLabel && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}

        <div className={styles.inputWrapper}>
          {hasLeftAccessory && <div className={styles.accessoryLeft}>{leftAccessory}</div>}

          <input
            id={inputId}
            ref={ref}
            className={cn(
              styles.input,
              {
                [styles.hasError]: hasError,
                [styles.withLeftAccessory]: hasLeftAccessory,
                [styles.withRightAccessory]: hasRightAccessory,
              },
              className
            )}
            aria-invalid={hasError}
            {...rest}
          />

          {hasRightAccessory && <div className={styles.accessoryRight}>{rightAccessory}</div>}
        </div>

        {helperText && !hasError && <p className={styles.helperText}>{helperText}</p>}

        {hasError && (
          <p className={styles.errorMessage}>
            <AlertCircle size={12} />
            {errorMessage}
          </p>
        )}
      </button>
    )
  }
)

Input.displayName = 'Input'

export default Input
