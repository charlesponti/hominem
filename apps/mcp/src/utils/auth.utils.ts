import axios from 'axios'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HOMINEM_CONFIG_DIR = path.join(os.homedir(), '.hominem')
const CONFIG_FILE_PATH = path.join(HOMINEM_CONFIG_DIR, 'config.json')

/**
 * Reads the authentication token from the Hominem config file.
 * @returns The token string or null if not found or file is invalid.
 */
export function getAuthTokenFromFile(): string | null {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error(`Hominem config file not found: ${CONFIG_FILE_PATH}`)
    }

    const configContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf8')
    const config = JSON.parse(configContent)
    if (typeof config?.token === 'string') {
      return config.token
    }

    throw new Error(`Token not found or is not a string: ${CONFIG_FILE_PATH}`)
  } catch (error) {
    throw new Error(`Error reading or parsing Hominem config file: ${error}`)
  }
}

/**
 * Helper function to create an authenticated axios client
 * @returns An axios instance configured with the authentication token.
 */
export function getAuthenticatedClient(host = 'localhost', port = '4040') {
  // Get auth token
  const token = getAuthTokenFromFile()

  // Create an axios instance with the auth token
  const client = axios.create({
    baseURL: `http://${host}:${port}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return client
}
