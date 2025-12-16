import { useNavigation } from 'react-router'
import { cn } from '../../lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  navigation?: React.ReactNode
  backgroundImage?: string
  showNavigationProgress?: boolean
  containerClassName?: string
  className?: string
}

export function AppLayout({
  children,
  navigation,
  backgroundImage,
  showNavigationProgress = false,
  containerClassName,
  className,
}: AppLayoutProps) {
  const navigationState = useNavigation()
  const isNavigating = showNavigationProgress && navigationState.state !== 'idle'

  return (
    <>
      {/* Progress indicator for navigation */}
      {showNavigationProgress && isNavigating && (
        <div className="fixed top-0 left-0 w-full z-50">
          <div className="h-1 bg-primary animate-pulse" />
        </div>
      )}

      {/* Background image (optional) */}
      {backgroundImage && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${backgroundImage}')` }}
        />
      )}

      <div className={cn('bg-background text-foreground min-h-screen flex flex-col', className)}>
        {navigation}

        <main className="flex-1">
          <div className={cn('w-full max-w-3xl mx-auto px-2 md:px-4', containerClassName)}>
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
