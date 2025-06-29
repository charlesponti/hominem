import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { createSupabaseServerClient } from '../lib/supabase/server.js'
import { appRouter } from '../lib/trpc/routers/index.js'

// Create context for tRPC
async function createContext(opts: { req: Request }) {
  try {
    // Try to get authenticated user without throwing
    const { supabase } = createSupabaseServerClient(opts.req)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      // Return empty context for unauthenticated requests
      return {
        user: undefined,
        userId: undefined,
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      userId: user.id,
    }
  } catch (error) {
    console.warn('Error creating tRPC context:', error)
    // Return empty context for any errors
    return {
      user: undefined,
      userId: undefined,
    }
  }
}

// Handle tRPC requests
export async function loader({ request }: LoaderFunctionArgs) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext,
    onError({ error }) {
      console.error('tRPC Error:', error)
    },
  })
}

export async function action({ request }: ActionFunctionArgs) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext,
    onError({ error }) {
      console.error('tRPC Error:', error)
    },
  })
}
