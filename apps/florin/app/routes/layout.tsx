import { Outlet, useNavigation } from 'react-router'
import { MainNavigation } from '../components/main-navigation'

export default function Layout() {
  const navigation = useNavigation()
  const isNavigating = navigation.state !== 'idle'

  return (
    <>
      {/* Progress indicator for navigation */}
      {isNavigating && (
        <div className="fixed top-0 left-0 w-full z-50">
          <div className="h-1 bg-primary animate-pulse" />
        </div>
      )}
      <div className="bg-background text-foreground min-h-screen-dynamic min-w-full flex flex-col">
        <MainNavigation />
        <main className="flex-1 overflow-y-auto md:pl-16 pt-16 md:pt-6">
          <div className="container md:mx-auto px-0">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}
