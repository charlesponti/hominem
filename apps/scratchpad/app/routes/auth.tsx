import { AuthApp } from 'app/components/auth/auth-app'
import type { Route } from './+types/auth'

// Using the proper parameter name without destructuring
export function meta(args: Route.MetaArgs) {
  return [
    { title: 'Log In', foo: 'bar' },
    { name: 'description', content: 'Authentication demonstration page' },
  ]
}

export default function Auth() {
  return <AuthApp />
}
