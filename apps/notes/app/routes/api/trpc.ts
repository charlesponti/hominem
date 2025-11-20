const DEFAULT_API_URL = 'http://localhost:4040'

function resolveApiBaseUrl() {
  if (typeof process !== 'undefined' && process.env.VITE_PUBLIC_API_URL) {
    return process.env.VITE_PUBLIC_API_URL
  }

  return DEFAULT_API_URL
}

async function proxyToCentralizedApi(request: Request) {
  const apiBaseUrl = resolveApiBaseUrl()
  const incomingUrl = new URL(request.url)
  const targetUrl = new URL(apiBaseUrl)

  targetUrl.pathname = '/trpc'
  targetUrl.search = incomingUrl.search

  const hasBody = !['GET', 'HEAD'].includes(request.method.toUpperCase())
  const clonedRequest = hasBody ? request.clone() : request

  const requestInit: RequestInit & { duplex?: 'half' } = {
    method: clonedRequest.method,
    headers: new Headers(clonedRequest.headers),
    redirect: 'manual',
  }

  if (hasBody && clonedRequest.body) {
    requestInit.body = clonedRequest.body
    requestInit.duplex = 'half'
  }

  const response = await fetch(targetUrl.toString(), requestInit)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  })
}

export const loader = ({ request }: { request: Request }) => proxyToCentralizedApi(request)
export const action = ({ request }: { request: Request }) => proxyToCentralizedApi(request)
