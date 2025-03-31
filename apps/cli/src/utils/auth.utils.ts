import logger from '@ponti/utils/logger'
import axios from 'axios'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function getAuthToken() {
  const configFile = path.join(os.homedir(), '.hominem', 'config.json')

  if (!fs.existsSync(configFile)) {
    console.error('Not authenticated. Please run `hominem api auth` first')
    process.exit(1)
  }

  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))
    return config.token
  } catch (error) {
    logger.error('Error reading auth token', error)
    process.exit(1)
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
