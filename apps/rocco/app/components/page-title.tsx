import type { ReactNode } from 'react'

export type PageTitleVariant = 'serif' | 'sans' | 'large'

interface PageTitleProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageTitle({ title, subtitle, actions }: PageTitleProps) {
  return (
    <div className="flex flex-1 justify-between items-center gap-2 group pr-2">
      <div className="flex flex-col gap-1">
        <h1 className="heading-1 wrap-break-word">{title}</h1>
        {subtitle && <p className="font-serif text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
