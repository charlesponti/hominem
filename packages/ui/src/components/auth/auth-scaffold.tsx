import { Lock } from 'lucide-react'

interface AuthScaffoldProps {
  children: React.ReactNode
  title: string
  description?: string
  className?: string
}

export function AuthScaffold({
  children,
  title,
  description,
  className,
}: AuthScaffoldProps) {
  return (
    <div
      className={`
        min-h-screen flex items-center justify-center
        bg-gradient-to-br from-background to-muted/30
        p-4
        ${className ?? ''}
      `}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
