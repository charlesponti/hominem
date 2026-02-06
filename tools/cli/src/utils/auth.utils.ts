import axios from 'axios'

import { requireAccessToken } from './auth'

export async function getAuthToken() {
  return requireAccessToken()
}

// Helper function to create an authenticated axios client
export async function getAuthenticatedClient(host = 'localhost', port = '4445') {
  const token = await requireAccessToken()

  const client = axios.create({
    baseURL: `http://${host}:${port}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return client
}
