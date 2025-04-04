#!/usr/bin/env node

import { McpServer as Server } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerFlightsTool } from './tools/flights.js'
import { registerMentalWellnessTool } from './tools/mental-health.js'
import { registerNutritionTool } from './tools/nutrition.js'
import { registerSleepTool } from './tools/sleep.js'
import { registerWorkoutTool } from './tools/workout.js'

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
