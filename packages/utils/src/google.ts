/**
 * Returns true if the provided string is a Google host URL (<...>.googleapis.com or <...>.googleusercontent.com)
 */
export function isValidGoogleHost(input: string): boolean {
  try {
    const parsed = new URL(input)
    const hostname = parsed.hostname.toLowerCase()
    const allowedBaseDomains = ['googleapis.com', 'googleusercontent.com']

    return allowedBaseDomains.some((base) => {
      return hostname === base || hostname.endsWith(`.${base}`)
    })
  } catch {
    return false
  }
}
