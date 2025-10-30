#!/usr/bin/env node

// Redirect any console.log/info/warn to stderr so library logs don't break MCP stdio protocol
console.log = (...args: unknown[]) => console.error(...args)
console.info = (...args: unknown[]) => console.error(...args)
console.warn = (...args: unknown[]) => console.error(...args)

import { McpServer as Server } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerNotesResource } from './resources/notes'
import { registerFinanceTools } from './tools/finance'
import { registerFlightsTool } from './tools/flights'
import { registerMentalWellnessTool } from './tools/mental-health'
import { registerNotesTool } from './tools/notes'
import { registerNutritionTool } from './tools/nutrition'
import { registerSleepTool } from './tools/sleep'
import { registerTaxTool } from './tools/taxes'
import { registerWorkoutTool } from './tools/workout'

// Create an MCP server
const server = new Server({
  name: 'hominem-mcp-server',
  version: '0.1.0',
})

// Register all tools
registerWorkoutTool(server)
registerNutritionTool(server)
registerSleepTool(server)
registerMentalWellnessTool(server)
registerFlightsTool(server)
registerTaxTool(server)
registerFinanceTools(server)
registerNotesTool(server)
registerNotesResource(server)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
server.connect(transport).catch((error) => {
  throw new Error('Failed to connect to MCP server', { cause: error })
})
