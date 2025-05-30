import { Navbar } from '@/components/Navbar'
import { Outlet } from 'react-router'

export default function Layout() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-6 flex-grow">
        <Outlet />
      </main>
    </div>
  )
}
