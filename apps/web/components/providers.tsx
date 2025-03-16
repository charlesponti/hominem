'use client'

import { getQueryClient } from '@/lib/get-query-client'
import { ClerkProvider } from '@clerk/nextjs'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type * as React from 'react'
import { UserProvider } from '../context/user-context'
import { SidebarProvider } from './ui/sidebar'

export default function Providers({ children }: { children: React.ReactNode }) {
  // Get a query client instance
  const queryClient = getQueryClient()

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <SidebarProvider>{children}</SidebarProvider>
          <ReactQueryDevtools />
        </UserProvider>
      </QueryClientProvider>
    </ClerkProvider>
  )
}
