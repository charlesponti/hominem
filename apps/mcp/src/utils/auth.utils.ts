import axios from 'axios'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Allow overriding config path via environment variables
const DEFAULT_HOMINEM_CONFIG_DIR = path.join(os.homedir(), '.hominem')
const HOMINEM_CONFIG_DIR = process.env.HOMINEM_CONFIG_DIR || DEFAULT_HOMINEM_CONFIG_DIR
const CONFIG_FILE_PATH = process.env.HOMINEM_CONFIG_PATH || path.join(HOMINEM_CONFIG_DIR, 'config.json')

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
/**
 * Create an authenticated axios client. Host/port can be overridden via env vars.
 */
export function getAuthenticatedClient(
  host = process.env.HOMINEM_API_HOST || 'localhost',
  port = process.env.HOMINEM_API_PORT || '4040'
) {
  const token = getAuthTokenFromFile()

  return axios.create({
    baseURL: `http://${host}:${port}`,
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function handleApiError(
  error: unknown,
  toolName: string
): { isError: true; content: { type: 'text'; text: string }[] } {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error }, null, 2),
      },
    ],
  }
}
