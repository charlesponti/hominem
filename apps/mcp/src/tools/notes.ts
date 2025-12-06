import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getAuthenticatedClient, handleApiError } from '../utils/auth.utils.js'

export function registerNotesTool(server: McpServer) {
  server.tool(
    'create_note',
    {
      input: z
        .object({
          title: z.string().describe('The title of the note.'),
          content: z.string().describe('The content of the note.'),
        })
        .describe('Creates a new note.'),
    },
    async ({ input }) => {
      try {
        const response = await getAuthenticatedClient().post('/trpc/notes.create', input)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        }
      } catch (error) {
        return handleApiError(error, 'create_note')
      }
    }
  )

  server.tool(
    'list_notes',
    {
      input: z.object({}).describe('Lists all notes.'),
    },
    async () => {
      try {
        const response = await getAuthenticatedClient().get('/trpc/notes.list')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        }
      } catch (error) {
        return handleApiError(error, 'list_notes')
      }
    }
  )
}
