'use client'

import { getQueryClient } from '@/lib/get-query-client'
import { ClerkProvider } from '@clerk/nextjs'
import { QueryClientProvider } from '@tanstack/react-query'
import type * as React from 'react'
import { UserProvider } from '../context/user-context'
import { SidebarProvider } from './ui/sidebar'

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </UserProvider>
      </QueryClientProvider>
    </ClerkProvider>
  )
}
