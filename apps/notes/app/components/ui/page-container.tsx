import { cn } from '~/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function PageContainer({ 
  children, 
  className,
  maxWidth = '4xl',
  padding = 'md'
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full',
  }

  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div className={cn(
      'container mx-auto',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  )
} 
