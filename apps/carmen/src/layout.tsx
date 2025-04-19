import { LoadingScreen } from '@hominem/components/Loading'
import { Outlet } from 'react-router-dom'
import Footer from 'src/components/Footer'
import Header from 'src/components/Header'
import Toast from 'src/components/Toast'
import { useAuth } from 'src/lib/auth'

export default function Layout() {
  const { isPending, user } = useAuth()
  const isAuthenticated = !isPending && user

  return (
    <div className="h-full w-full flex flex-col items-center">
      <div className="h-full w-full flex flex-col sm:max-w-3xl px-2">
        <Header />
        <main data-testid="app-main" className="flex mt-8 w-full max-md:pb-16 pb-12">
          {isPending ? <LoadingScreen /> : <Outlet />}
          <Toast />
        </main>
      </div>
      {isAuthenticated && <Footer />}
    </div>
  )
}
