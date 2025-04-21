import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  className?: string
  onlyEnter?: boolean
  isLoading?: boolean
}

export const Button = ({ className, children, isLoading, onlyEnter, ...props }: Props) => {
  const disabled = props.disabled || isLoading
  const disabledClassName = disabled ? 'opacity-50 cursor-not-allowed' : ''

  const onKeyPressHandler = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (onlyEnter && e.key !== 'Enter') {
      return
    }

    props.onKeyDown?.(e)
    props.onKeyUp?.(e)
  }

  return (
    <button
      {...props}
      className={twMerge(
        'btn btn-primary text-white font-semibold text-md',
        className,
        disabledClassName
      )}
      onKeyDown={onKeyPressHandler}
      onKeyUp={onKeyPressHandler}
    >
      {isLoading ? <span className="loading-dots loading-md bg-white h-6" /> : children}
    </button>
  )
}

export default Button
