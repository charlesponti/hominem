#!/usr/bin/env node

import { McpServer as Server } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerFlightsTool } from './tools/flights.ts'
import { registerMentalWellnessTool } from './tools/mental-health.ts'
import { registerNutritionTool } from './tools/nutrition.ts'
import { registerSleepTool } from './tools/sleep.ts'
import { registerWorkoutTool } from './tools/workout.ts'

// Create an MCP server
const server = new Server({
  name: 'health-and-fitness-server',
  version: '0.1.0',
})

// Register all tools
registerWorkoutTool(server)
registerNutritionTool(server)
registerSleepTool(server)
registerMentalWellnessTool(server)
registerFlightsTool(server)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
server.connect(transport).catch((error) => {
  throw new Error('Failed to connect to MCP server', { cause: error })
})
