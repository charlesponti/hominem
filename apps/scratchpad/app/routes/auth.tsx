import { SignIn } from '@clerk/react-router'

// Render Clerk SignIn component for the /auth route
export default function Auth() {
  return <SignIn routing="path" path="/auth" />
}
