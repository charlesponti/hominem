import { Sparkles, User } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { Toaster } from '~/components/ui/toaster'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 bg-background">
          <div className="flex h-16 items-center px-4 border-b">
            <div className="flex items-center space-x-2">
              <span className="bg-purple-500 p-2 rounded-md">
                <Sparkles className="size-4 text-white" />
              </span>
              <Link to="/" className="font-bold text-lg">
                Notes
              </Link>
            </div>
            <div className="flex flex-1 items-center justify-end space-x-4">
              <nav className="flex items-center space-x-2">
                <Link to="/account" className="p-2 border border-gray-300 rounded-full">
                  <User className="size-4" />
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
