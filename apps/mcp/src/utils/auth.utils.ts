import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import axios, { type AxiosInstance } from 'axios'

// Minimal declaration so TypeScript recognizes process.env without requiring @types/node
declare const process: { env: Record<string, string | undefined> }

// Allow overriding config path via environment variables
const DEFAULT_HOMINEM_CONFIG_DIR = path.join(os.homedir(), '.hominem')
const HOMINEM_CONFIG_DIR = process.env.HOMINEM_CONFIG_DIR || DEFAULT_HOMINEM_CONFIG_DIR
const CONFIG_FILE_PATH =
  process.env.HOMINEM_CONFIG_PATH || path.join(HOMINEM_CONFIG_DIR, 'config.json')

/**
 * Authentication error messages
 */
const AUTH_ERROR_MESSAGES = {
  NO_CONFIG_FILE: `Authentication required. Config file not found at: ${CONFIG_FILE_PATH}

To authenticate, run one of the following:
  1. CLI: hominem auth
  2. Manual: Create ${CONFIG_FILE_PATH} with: {"token": "YOUR_SUPABASE_JWT"}
  
Visit http://localhost:4444/auth/cli to get a token.`,

  NO_TOKEN: `Token not found in config file: ${CONFIG_FILE_PATH}

Your config file exists but doesn't contain a valid token.
Run 'hominem auth' to authenticate or manually add a token to the config file.`,

  INVALID_TOKEN: `Authentication failed. Your token may be invalid or expired.

Please re-authenticate by running 'hominem auth'.`,

  PARSING_ERROR: (error: unknown) =>
    `Error reading config file: ${CONFIG_FILE_PATH}
${error}

The config file may be corrupted. Try running 'hominem auth' to re-authenticate.`,
}

/**
 * Reads the authentication token from the Hominem config file.
 * @returns The token string or throws an error with helpful message.
 * @throws Error with user-friendly message if token cannot be retrieved.
 */
export function getAuthTokenFromFile() {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error(AUTH_ERROR_MESSAGES.NO_CONFIG_FILE)
    }

    const configContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf8')
    const config = JSON.parse(configContent)

    if (typeof config?.token === 'string' && config.token.trim().length > 0) {
      return config.token.trim()
    }

    throw new Error(AUTH_ERROR_MESSAGES.NO_TOKEN)
  } catch (error) {
    // If it's already one of our custom errors, re-throw it
    if (error instanceof Error && error.message.includes('Authentication')) {
      throw error
    }
    // Otherwise, wrap it with a parsing error message
    throw new Error(AUTH_ERROR_MESSAGES.PARSING_ERROR(error))
  }
}

/**
 * Get the base API URL from environment variables or use default.
 * @returns The base API URL (e.g., 'http://localhost:4040')
 */
export function getApiBaseUrl() {
  const host = process.env.HOMINEM_API_HOST || 'localhost'
  const port = process.env.HOMINEM_API_PORT || '4040'
  return `http://${host}:${port}`
}

/**
 * Create an authenticated axios client. Host/port can be overridden via env vars.
 * @returns An axios instance configured with the authentication token.
 * @throws Error if token cannot be retrieved.
 */
export function getAuthenticatedClient(): AxiosInstance {
  const token = getAuthTokenFromFile()
  const baseURL = getApiBaseUrl()

  const client = axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}` },
  })

  // Add response interceptor to detect authentication failures
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Enhance 401 errors with helpful message
        const enhancedError = new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN)
        enhancedError.cause = error
        throw enhancedError
      }
      throw error
    }
  )

  return client
}

/**
 * Handle API errors in a consistent way for MCP tools.
 * @param error The error from the API call
 * @param toolName The name of the tool that failed
 * @returns A standardized MCP error response
 */
export function handleApiError(
  error: unknown,
  toolName: string
): { isError: true; content: { type: 'text'; text: string }[] } {
  let errorMessage: string

  if (error instanceof Error) {
    // If it's one of our custom authentication errors, use the full message
    if (error.message.includes('Authentication')) {
      errorMessage = error.message
    } else if (axios.isAxiosError(error)) {
      // Format axios errors nicely
      errorMessage = `API Error: ${error.response?.status || 'Network Error'}\n${
        error.response?.data?.error || error.message
      }`
    } else {
      errorMessage = error.message
    }
  } else {
    errorMessage = String(error)
  }

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            tool: toolName,
            error: errorMessage,
          },
          null,
          2
        ),
      },
    ],
  }
}
