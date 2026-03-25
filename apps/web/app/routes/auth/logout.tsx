import { getSetCookieHeaders } from '@hominem/utils/headers'
import { redirect } from 'react-router'
import type { ActionFunctionArgs } from 'react-router'

import { getAuthApiBaseUrl } from './config'

export async function action({ request }: ActionFunctionArgs) {
  const headers = new Headers()
  const upstreamHeaders = new Headers()
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    upstreamHeaders.set('cookie', cookieHeader)
  }

  try {
    const response = await fetch(new URL('/api/auth/logout', getAuthApiBaseUrl()), {
      method: 'POST',
      headers: upstreamHeaders,
    })
    const setCookieValues = getSetCookieHeaders(response.headers)
    if (setCookieValues.length > 0) {
      for (const value of setCookieValues) {
        headers.append('set-cookie', value)
      }
    } else {
      const setCookie = response.headers.get('set-cookie')
      if (setCookie) headers.append('set-cookie', setCookie)
    }
  } catch {
    // proceed with redirect regardless
  }

  return redirect('/auth', { headers })
}

export async function loader() {
  return redirect('/auth')
}
