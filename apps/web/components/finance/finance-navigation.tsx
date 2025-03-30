'use client'

import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet'

export function FinanceNavigation() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Transactions & Accounts', href: '/finance/transactions' },
    { name: 'Import Data', href: '/finance/import' },
    { name: 'Budget Calculator', href: '/finance/budget' },
    { name: 'Runway Calculator', href: '/finance/runway' },
    { name: 'Location Comparison', href: '/finance/location-comparison' },
    { name: 'Music Streaming Calculator', href: '/finance/music-streaming-calculator' },
    { name: 'Sales Tax Calculator', href: '/finance/sales-tax-calculator' },
    { name: 'Travel Cost Calculator', href: '/finance/travel-cost' },
  ]

  return (
    <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetTrigger asChild className="lg:hidden">
        <Button variant="ghost" size="icon" className="ml-2 mt-2">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-64">
        <nav className="flex flex-col gap-2 mt-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="block px-4 py-2 text-sm hover:bg-accent rounded-md"
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
