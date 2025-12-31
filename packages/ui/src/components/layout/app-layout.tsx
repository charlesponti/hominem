import { useNavigation } from 'react-router'

interface AppLayoutProps {
  children: React.ReactNode
  navigation?: React.ReactNode
  backgroundImage?: string
}

export function AppLayout({ children, navigation, backgroundImage }: AppLayoutProps) {
  const navigationState = useNavigation()
  const isNavigating = navigationState.state !== 'idle'

  return (
    <>
      {isNavigating && (
        <div className="fixed top-0 left-0 w-full z-50">
          <div className="h-1 bg-primary animate-pulse" />
        </div>
      )}

      {backgroundImage && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${backgroundImage}')` }}
        />
      )}

      <div className="flex flex-col">
        {navigation}

        <main className="flex-1 mt-24">
          <div className="w-full px-2 pb-12">{children}</div>
        </main>
      </div>
    </>
  )
}
