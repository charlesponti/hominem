'use client'

import { cn } from '@/lib/utils'
import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs'
import {
  CircleDollarSign,
  FilePen,
  LogOut,
  Menu,
  MessageCircle,
  PaintbrushIcon,
  User,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from './ui/sheet'

const navItems = [
  {
    title: 'Career',
    icon: FilePen,
    items: [
      {
        title: 'Applications',
        icon: User,
        url: '/career/job-applications',
      },
    ],
  },
  {
    title: 'Finance',
    icon: CircleDollarSign,
    url: '/finance',
  },
  {
    title: 'Chats',
    icon: MessageCircle,
    url: '/chat',
  },
  {
    title: 'Creative',
    icon: PaintbrushIcon,
    items: [
      {
        title: 'Content Strategy',
        icon: PaintbrushIcon,
        url: '/creative/content-strategy',
      },
    ],
  },
]

export function MainNavigation() {
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const isLoggedIn = isLoaded && user
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu when navigating
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="md:container md:mx-auto px-4 flex h-16 items-center">
        {/* Logo */}
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo-hominem-transparent.png"
              alt="Hominem Logo"
              width={30}
              height={30}
              className="rounded-md"
            />
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex md:flex-1 md:items-center md:justify-between">
          <ul className="flex items-center gap-6">
            {navItems.map((item) => (
              <li key={item.title} className="relative group">
                {item.url ? (
                  <Link
                    href={item.url}
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                      pathname.startsWith(item.url) && 'text-primary'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium cursor-default">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                )}

                {/* Dropdown for submenus */}
                {item.items && item.items.length > 0 && (
                  <div className="absolute left-0 top-full z-10 mt-2 w-48 rounded-md border bg-background p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <ul className="space-y-1">
                      {item.items.map((subItem) => (
                        <li key={subItem.title}>
                          <Link
                            href={subItem.url}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted',
                              pathname.startsWith(subItem.url) && 'bg-muted'
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            <span>{subItem.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* User/Auth Section */}
          <div className="flex items-center gap-2">
            {!isLoaded ? (
              <div className="h-9 w-9 rounded-full animate-pulse bg-muted" />
            ) : isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 rounded-full"
                    aria-label="User menu"
                  >
                    <div className="flex items-center gap-2">
                      <div className="rounded-full p-1 bg-gray-100">
                        <User size={18} />
                      </div>
                      <span className="hidden sm:inline-block">{user.fullName}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <SignOutButton>
                      <Button
                        variant="ghost"
                        className="w-full flex items-center justify-start gap-2 p-0"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </Button>
                    </SignOutButton>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SignInButton>
                <Button>Sign in</Button>
              </SignInButton>
            )}
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          {isLoggedIn && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2" aria-label="Toggle menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
                <div className="px-4 py-6">
                  <div className="mb-8 flex items-center">
                    <Image
                      src="/logo-hominem-transparent.png"
                      alt="Hominem Logo"
                      width={30}
                      height={30}
                      className="rounded-md"
                    />
                    <span className="ml-2 text-xl font-bold">hominem</span>
                  </div>

                  <nav className="flex flex-col space-y-6">
                    {navItems.map((item) => (
                      <div key={item.title} className="space-y-2">
                        {item.url ? (
                          <SheetClose asChild>
                            <Link
                              href={item.url}
                              className={cn(
                                'flex items-center gap-2 text-sm font-medium',
                                pathname.startsWith(item.url) && 'text-primary'
                              )}
                            >
                              <item.icon className="h-5 w-5" />
                              <span>{item.title}</span>
                            </Link>
                          </SheetClose>
                        ) : (
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <item.icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </div>
                        )}

                        {item.items && item.items.length > 0 && (
                          <ul className="ml-6 space-y-2 border-l pl-4">
                            {item.items.map((subItem) => (
                              <li key={subItem.title}>
                                <SheetClose asChild>
                                  <Link
                                    href={subItem.url}
                                    className={cn(
                                      'flex items-center gap-2 text-sm',
                                      pathname.startsWith(subItem.url) && 'text-primary'
                                    )}
                                  >
                                    <subItem.icon className="h-4 w-4" />
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SheetClose>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Mobile User Menu */}
          {!isLoaded ? (
            <div className="h-9 w-9 rounded-full animate-pulse bg-muted" />
          ) : isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="User menu">
                  <div className="rounded-full p-1 bg-gray-100">
                    <User size={18} />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <SignOutButton>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-start gap-2 p-0"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </Button>
                  </SignOutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SignInButton>
              <Button>Sign in</Button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  )
}
