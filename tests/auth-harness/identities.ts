export interface AuthTestIdentity {
  email: string
  name: string
}

function randomSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

export function createAuthTestIdentity(prefix = 'auth-test'): AuthTestIdentity {
  const suffix = randomSuffix()
  return {
    email: `${prefix}-${suffix}@hominem.test`,
    name: `${prefix} ${suffix}`,
  }
}
