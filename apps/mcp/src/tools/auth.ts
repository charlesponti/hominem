
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import axios from 'axios'
import { z } from 'zod'

// In a real application, you would likely manage tokens per session or request context
// For simplicity, we'll keep a placeholder for now.
let currentAuthToken: string | null = null

// Function to validate the token with the web app
async function validateToken(token: string): Promise<boolean> {
  try {
    // Replace with your actual web app's token validation endpoint
    const validationUrl = `http://localhost:4444/api/auth/validate-token`
    const response = await axios.post(validationUrl, { token })
    return response.data.isValid
  } catch (error) {
    console.error('Token validation failed:', error)
    return false
  }
}

export function registerAuthTool(server: McpServer) {
  server.tool(
    'login',
    {
      input: z
        .object({
          token: z.string().describe('The authentication token.'),
        })
        .describe('Logs the user in.'),
    },
    async ({ input }) => {
      const isValid = await validateToken(input.token)

      if (isValid) {
        currentAuthToken = input.token // Store for demonstration; ideally, this is session-scoped
        return {
          content: [
            {
              type: 'text',
              text: 'Login successful.',
            },
          ],
        }
      } else {
        return {
          content: [
            {
              type: 'text',
              text: 'Login failed: Invalid token.',
            },
          ],
        }
      }
    }
  )
}

export function getAuthToken() {
  return currentAuthToken
}
