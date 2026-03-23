import { AuthGate } from './auth/auth-gate';
import { DesktopAuthProvider } from './auth/auth-provider';

export function App() {
  return (
    <DesktopAuthProvider>
      <AuthGate />
    </DesktopAuthProvider>
  );
}
