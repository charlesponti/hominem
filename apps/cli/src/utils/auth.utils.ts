import axios from 'axios'
import { consola } from 'consola'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function getAuthToken() {
  const configFile = path.join(os.homedir(), '.hominem', 'config.json')

  if (!fs.existsSync(configFile)) {
    consola.warn('Authentication token not found or config file is invalid.')
    throw new Error(
      'Authentication required. Please run `hominem auth` or provide a token via --token option.'
    )
  }

  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))
    consola.info('Using token from config file')
    return config.token
  } catch (error) {
    consola.warn('Authentication token not found or config file is invalid.')
    throw new Error(
      'Authentication required. Please run `hominem auth` or provide a token via --token option.'
    )
  }
}

// Helper function to create an authenticated axios client
export function getAuthenticatedClient(host = 'localhost', port = '4445') {
  // Get auth token
  const token = getAuthToken()

  // Create an axios instance with the auth token
  const client = axios.create({
    baseURL: `http://${host}:${port}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return client
}
