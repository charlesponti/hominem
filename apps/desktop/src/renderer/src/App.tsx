import { AuthGate } from './auth/auth-gate'
import { DesktopAuthProvider } from './auth/desktop-auth-provider'

export function App() {
  return (
    <DesktopAuthProvider>
      <AuthGate />
    </DesktopAuthProvider>
  )
}
