import type { PropsWithChildren } from 'react'
import { Link, useMatches } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'

const AppLink = ({
  btn,
  to,
  className,
  children,
  ...props
}: PropsWithChildren<
  React.HTMLProps<HTMLAnchorElement> & {
    btn?: boolean
    className?: string
    to: string
  }
>) => {
  if (btn) {
    return (
      <Link to={to} {...props}>
        <span
          className={twMerge(
            'btn btn-primary text-white px-4 py-3 hover:cursor-pointer',
            className
          )}
        >
          {children}
        </span>
      </Link>
    )
  }

  return (
    <Link
      to={to}
      className={twMerge(
        'text-black',
        useMatches().some((match) => match.pathname === to) ? 'bg-blue-100' : null,
        className
      )}
      {...props}
    >
      {children}
    </Link>
  )
}

export default AppLink
