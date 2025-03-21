'use client'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const navigation = [
  { name: 'budget', href: '/finance/budget' },
  {
    name: 'location comparison',
    href: '/finance/location-comparison',
  },
  {
    name: 'Music Streaming Calculator',
    href: '/finance/music-streaming-calculator',
  },
  {
    name: 'runway',
    href: '/finance/runway',
  },
  {
    name: 'sales tax',
    href: '/finance/sales-tax-calculator',
  },
  {
    name: 'Travel Cost',
    href: '/finance/travel-cost',
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  const NavItems = () => (
    <>
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className="block px-4 py-2 text-sm hover:bg-accent rounded-md"
        >
          {item.name}
        </Link>
      ))}
    </>
  )

  return (
    <div className="min-h-screen">
      {/* Mobile Navigation */}
      <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="ml-2 mt-2">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-64">
          <nav className="flex flex-col gap-2 mt-4">
            <NavItems />
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={cn('hidden lg:flex w-64 flex-col border-r min-h-screen p-4')}>
          <nav className="flex flex-col gap-2">
            <NavItems />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  )
}
