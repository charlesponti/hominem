import React from 'react'

export function Link({ children }: { children: React.ReactNode }) {
  return children
}

export function Redirect({ href }: { href: string }) {
  return href
}

export function useLocalSearchParams<T extends Record<string, unknown> = Record<string, unknown>>() {
  return {} as T
}

export function usePathname() {
  return '/'
}

export function useRouter() {
  return {
    push: () => undefined,
    replace: () => undefined,
  }
}
