declare module 'virtual:pwa-register/react' {
  import type React from 'react'

  export function useRegisterSW(options?: {
    immediate?: boolean
    onRegistered?: (swUrl?: string) => void
    onRegisterError?: (err: unknown) => void
  }): {
    needRefresh: readonly [boolean, React.Dispatch<React.SetStateAction<boolean>>]
    updateServiceWorker: (reload?: boolean) => Promise<void>
  }
}
