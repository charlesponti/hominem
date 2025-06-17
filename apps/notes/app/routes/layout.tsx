import { Lightbulb, Sparkles, User } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { Toaster } from '~/components/ui/toaster'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 bg-white border-b">
          <div className="flex h-16 items-center px-4">
            <div className="flex items-center space-x-2">
              <span className="bg-purple-500 p-2 rounded-md">
                <Sparkles className="size-4 text-white" />
              </span>
              <Link to="/" className="font-bold text-lg">
                Sage
              </Link>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <nav className="flex items-center space-x-6">
                <Link
                  to="/notes"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Notes
                </Link>
                <Link
                  to="/content-strategy"
                  className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Lightbulb className="size-4" />
                  <span>Content Strategy</span>
                </Link>
                <Link
                  to="/goals"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Goals
                </Link>
                <Link
                  to="/habits"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Habits
                </Link>
              </nav>
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
