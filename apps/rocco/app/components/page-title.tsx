import type { ReactNode } from 'react'

export type PageTitleVariant = 'serif' | 'sans' | 'large'

interface PageTitleProps {
  title: string
  subtitle?: string
  variant?: PageTitleVariant
  actions?: ReactNode
  className?: string
}

const variantStyles = {
  serif: 'heading-1',
  sans: 'text-2xl font-bold',
  large: 'text-3xl font-semilight',
}

export default function PageTitle({
  title,
  subtitle,
  variant = 'serif',
  actions,
  className = '',
}: PageTitleProps) {
  return (
    <div className={`flex flex-1 justify-between items-center gap-2 group pr-2 ${className}`}>
      <div className="flex flex-col gap-1">
        <h1 className={`${variantStyles[variant]} wrap-break-word`}>{title}</h1>
        {subtitle && <p className="font-serif text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
