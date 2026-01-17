import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import axios from 'axios'

const CONFIG_FILE = path.join(os.homedir(), '.hominem', 'config.json')

interface AuthConfig {
  accessToken: string
  refreshToken?: string
  timestamp: string
}

async function readAuthConfig(): Promise<AuthConfig | null> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (_error) {
    return null
  }
}

async function writeAuthConfig(config: AuthConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true })
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export async function getValidAccessToken(): Promise<string | null> {
  const config = await readAuthConfig()

  if (!config || !config.accessToken) {
    return null
  }

  // For simplicity, let's assume tokens expire after 1 hour (3600 seconds)
  // In a real scenario, you'd check the token's actual expiry (e.g., from JWT payload)
  const tokenIssuedAt = new Date(config.timestamp).getTime()
  const now = Date.now()
  const oneHour = 3600 * 1000 // 1 hour in milliseconds

  if (now - tokenIssuedAt > oneHour && config.refreshToken) {
    // Token expired, try to refresh
    try {
      const response = await axios.post('http://localhost:4444/api/auth/refresh-token', {
        refreshToken: config.refreshToken,
      })
      const { accessToken, refreshToken: newRefreshToken } = response.data

      if (accessToken) {
        config.accessToken = accessToken
        config.timestamp = new Date().toISOString()
        if (newRefreshToken) {
          config.refreshToken = newRefreshToken
        }
        await writeAuthConfig(config)
        return accessToken
      }
      return null // Refresh failed
    } catch (_error) {
      return null
    }
  }

  // Token is still valid or successfully refreshed
  return config.accessToken
}
