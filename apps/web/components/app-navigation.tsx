'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs'
import { CheckCircle, DollarSign, FilePen, LogOut, User } from 'lucide-react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const data = {
  navMain: [
    {
      title: 'Dashboard',
      icon: CheckCircle,
      url: '/dashboard',
    },
    {
      title: 'Finance',
      icon: DollarSign,
      url: '/finance/billing',
    },
    {
      title: 'Career',
      icon: FilePen,
      url: '/career',
      items: [
        {
          title: 'Applications',
          icon: User,
          url: '/career/applications',
          isActive: false,
        },
      ],
    },
  ],
}

export function SiteNavigation() {
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const { toggleSidebar } = useSidebar()
  const isLoggedIn = isLoaded && user

  useEffect(() => {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'i' && event.metaKey) {
        event.preventDefault()
        toggleSidebar()
      }
    })
  }, [toggleSidebar])

  return (
    <Sidebar>
      <SidebarHeader className="min-h-fit flex flex-col gap-4 justify-center my-2">
        <div className="flex items-center justify-center p-4 bg-[rgba(238,238,238,1)] rounded-xl">
          <Image src="/logo-hominem-transparent.png" alt="Hominem Logo" width={30} height={30} />
          <h1 className="text-2xl font-bold">ominem</h1>
        </div>
        <div>
          {!isLoaded ? (
            <div className="w-full flex items-center justify-center border-input border rounded-md px-3 h-12">
              <span className="loading loading-dots text-gray-300" />
            </div>
          ) : isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full flex justify-between items-center gap-2 h-12"
                >
                  <div className="flex items-center gap-2">
                    <div className="rounded-full p-1 bg-gray-100">
                      <User size={14} />
                    </div>
                    <span>{user.fullName}</span>
                  </div>
                  {/* <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.3575 6.00608 10.6424 6.00608 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.73379 9.9026 7.61934 9.95001 7.49999 9.95001C7.38064 9.95001 7.26618 9.9026 7.18179 9.81821L4.18179 6.81821C4.00605 6.64247 4.00605 6.35755 4.18179 6.18181Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg> */}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem>
                  <SignOutButton>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-start gap-2 p-0"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </Button>
                  </SignOutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SignInButton>
              <Button size="lg" className="w-full h-12">
                Sign in
              </Button>
            </SignInButton>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="max-w-full">
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title} className={cn('max-w-full', { 'my-0 pb-0': !item.items })}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            {item.items ? (
              <SidebarGroupContent className="pl-6 w-full">
                <SidebarMenu>
                  {item.items?.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname.indexOf(item.url) > -1}>
                        <div>
                          <item.icon size={14} />
                          <a href={item.url}>{item.title}</a>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            ) : null}
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
