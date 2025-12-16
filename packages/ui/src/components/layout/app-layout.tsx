import { useNavigation } from 'react-router'

interface AppLayoutProps {
  children: React.ReactNode
  navigation?: React.ReactNode
  backgroundImage?: string
  showNavigationProgress?: boolean
}

export function AppLayout({
  children,
  navigation,
  backgroundImage,
  showNavigationProgress = false,
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

      <div className="flex flex-col">
        {navigation}

        <main className="flex-1 mt-24">
          <div className="w-full max-w-3xl mx-auto px-2 md:px-0">{children}</div>
        </main>
      </div>
    </>
  )
}
