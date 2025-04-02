import { Navbar } from 'app/components/Navbar'
import { ThemeProvider } from 'app/components/ui/theme-provider'
import { Outlet } from 'react-router'
import { AuthProvider } from '~/lib/supabase/auth-context'

export default function Layout() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="cosmic-noir">
        <div className="min-h-screen bg-base-100 text-base-content flex flex-col">
          <Navbar />
          <main className="container mx-auto px-4 py-6 flex-grow">
            <Outlet />
          </main>
          <footer className="footer footer-center p-4 bg-base-200 text-base-content">
            <aside>
              <p>Copyright © {new Date().getFullYear()} - All rights reserved</p>
            </aside>
          </footer>
        </div>
      </ThemeProvider>
    </AuthProvider>
  )
}
