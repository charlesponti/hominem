import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import axios from 'axios'
import { getAuthToken } from '../tools/auth'

const API_URL = 'http://localhost:4040/trpc'

export function registerNotesResource(server: McpServer) {
  server.resource(
    'notes',
    'note://*',
    async (uri: string) => {
      const noteId = uri.replace('note://', '')
      const token = getAuthToken()
      if (!token) {
        return {
          error: 'You must be logged in to get a note.',
        }
      }
      try {
        const response = await axios.get(`${API_URL}/notes.get?id=${noteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const note = response.data
        return {
          content: note.content,
          mimetype: 'text/plain',
        }
      } catch (error: unknown) {
        return {
          error: (error as Error).message,
        }
      }
    },
    async () => {
      const token = getAuthToken()
      if (!token) {
        return {
          error: 'You must be logged in to list notes.',
        }
      }
      try {
        const response = await axios.get(`${API_URL}/notes.list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const notes = response.data
        return notes.map((note) => ({
          uri: `note://${note.id}`,
          title: note.title,
        }))
      } catch (error: unknown) {
        return {
          error: (error as Error).message,
        }
      }
    }
  )
}
