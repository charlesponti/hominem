import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getAuthenticatedClient } from '../utils/auth.utils.js'

export function registerNotesResource(server: McpServer) {
  // Lazy initialize the API client
  const getApiClient = () => getAuthenticatedClient()

  server.resource(
    'notes',
    'note://*',
    async (uri: string) => {
      const noteId = uri.replace('note://', '')

      try {
        const response = await getApiClient().get(`/trpc/notes.get?id=${noteId}`)
        const note = response.data
        return {
          content: note.content,
          mimetype: 'text/plain',
        }
      } catch (error: unknown) {
        // Extract helpful error message
        let errorMessage = 'Failed to retrieve note.'
        if (error instanceof Error) {
          errorMessage = error.message.includes('Authentication')
            ? error.message
            : `Error: ${error.message}`
        }
        return {
          error: errorMessage,
        }
      }
    },
    async () => {
      try {
        const response = await getApiClient().get('/trpc/notes.list')
        const notes = response.data
        return notes.map((note: { id: string; title: string }) => ({
          uri: `note://${note.id}`,
          title: note.title,
        }))
      } catch (error: unknown) {
        // Extract helpful error message
        let errorMessage = 'Failed to list notes.'
        if (error instanceof Error) {
          errorMessage = error.message.includes('Authentication')
            ? error.message
            : `Error: ${error.message}`
        }
        return {
          error: errorMessage,
        }
      }
    }
  )
}
