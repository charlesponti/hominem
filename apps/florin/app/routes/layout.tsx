import { Outlet, useNavigation } from 'react-router'
import { MainNavigation } from '../components/main-navigation'

export default function Layout() {
  const navigation = useNavigation()
  const isNavigating = navigation.state !== 'idle'

  return (
    <div>
      {/* Progress indicator for navigation */}
      {isNavigating && (
        <div className="fixed top-0 left-0 w-full z-50">
          <div className="h-1 bg-primary animate-pulse" />
        </div>
      )}
      <div className="bg-background text-foreground min-h-screen min-w-full flex flex-col max-h-screen overflow-x-hidden">
        <MainNavigation />
        <main className="flex-1 overflow-y-auto md:pl-16 pt-14 md:pt-4">
          <div className="md:container md:mx-auto md:h-[calc(100dvh-85px)] px-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
