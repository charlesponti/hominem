declare module 'virtual:pwa-register/react' {
  import type React from 'react'

  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: unknown) => void
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: readonly [boolean, React.Dispatch<React.SetStateAction<boolean>>]
    offlineReady: readonly [boolean, React.Dispatch<React.SetStateAction<boolean>>]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
