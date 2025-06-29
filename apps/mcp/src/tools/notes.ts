
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import axios from 'axios';
import { getAuthToken } from './auth';
import { z } from 'zod';

const API_URL = 'http://localhost:4445/trpc';

export function registerNotesTool(server: McpServer) {
  server.tool(
    'create_note',
    {
      input: z.object({
        title: z.string().describe('The title of the note.'),
        content: z.string().describe('The content of the note.'),
      }).describe('Creates a new note.'),
    },
    async ({ input }) => {
      try {
        const token = getAuthToken();
        if (!token) {
          return {
            content: [
              {
                type: 'text',
                text: 'You must be logged in to create a note.',
              },
            ],
          };
        }
        const response = await axios.post(`${API_URL}/notes.create`, input, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ status: 'error', error: error.message }, null, 2),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'list_notes',
    {
      input: z.object({}).describe('Lists all notes.'),
    },
    async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          return {
            content: [
              {
                type: 'text',
                text: 'You must be logged in to list notes.',
              },
            ],
          };
        }
        const response = await axios.get(`${API_URL}/notes.list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ status: 'error', error: error.message }, null, 2),
            },
          ],
        };
      }
    }
  );
}
