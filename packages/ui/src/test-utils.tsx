import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render, renderHook as rtlRenderHook } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'

interface AllTheProvidersProps {
  children: ReactNode
  initialEntries?: string[]
}

function AllTheProviders({ children, initialEntries = ['/'] }: AllTheProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: children,
      },
    ],
    {
      initialEntries,
    }
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
}

// @ts-ignore
const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { initialEntries, ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders initialEntries={initialEntries}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  })
}

const renderHook = <T,>(hook: () => T, options?: { initialEntries?: string[] }) => {
  const { initialEntries } = options ?? {}
  return rtlRenderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AllTheProviders initialEntries={initialEntries}>{children}</AllTheProviders>
    ),
  })
}

export * from '@testing-library/react'
export { customRender as render, renderHook }
