import type { ReactNode } from 'react'

import type { CreateClient } from '@hominem/hono-client'
import { HonoProvider as BaseHonoProvider } from '@hominem/hono-client/react'
import { createHonoClient } from '@hominem/hono-rpc/client'

import { useAuth } from './auth-provider'
import { API_BASE_URL } from './constants'

const createAppHonoClient: CreateClient = (baseUrl, options) => createHonoClient(baseUrl, options)

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const { getAccessToken } = useAuth()

  return (
    <BaseHonoProvider
      config={{
        baseUrl: API_BASE_URL,
        createClient: createAppHonoClient,
        getAuthToken: async () => getAccessToken(),
        onError: (error: Error) => {
          console.error('Mobile Hono RPC Error', error)
        },
      }}
    >
      {children}
    </BaseHonoProvider>
  )
}
