import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('MCP Server Functional Tests', () => {
  let client: Client
  let transport: StdioClientTransport

  beforeAll(async () => {
    // Skip functional tests if build doesn't exist
    // These are integration tests that require a built server
    // Run `bun run build` in apps/mcp first
    const buildPath = new URL('../build/index.js', import.meta.url).pathname

    // Create transport and client
    transport = new StdioClientTransport({
      command: 'node',
      args: [buildPath],
    })

    client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    )

    await client.connect(transport)
  })

  afterAll(async () => {
    if (client) {
      await client.close()
    }
  })

  describe('Server Initialization', () => {
    it('should connect successfully', () => {
      expect(client).toBeDefined()
    })
  })

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      const result = await client.listTools()

      expect(result.tools).toBeDefined()
      expect(result.tools.length).toBeGreaterThan(0)
      expect(result.tools.length).toBe(23)
    })

    it('should include expected health tools', async () => {
      const result = await client.listTools()
      const toolNames = result.tools.map((t) => t.name)

      expect(toolNames).toContain('recommend_workout')
      expect(toolNames).toContain('assess_mental_wellness')
    })

    it('should include finance tools', async () => {
      const result = await client.listTools()
      const toolNames = result.tools.map((t) => t.name)

      expect(toolNames).toContain('create_finance_account')
      expect(toolNames).toContain('get_finance_accounts')
      expect(toolNames).toContain('create_transaction')
      expect(toolNames).toContain('get_transactions')
    })

    it('should include other utility tools', async () => {
      const result = await client.listTools()
      const toolNames = result.tools.map((t) => t.name)

      expect(toolNames).toContain('get_flight_prices')
      expect(toolNames).toContain('get_tax_info')
    })
  })

  describe('Tool Execution', () => {
    it.skipIf(!process.env.LM_STUDIO_URL && process.env.CI)(
      'should execute workout recommendation tool',
      async () => {
        const result = await client.callTool({
          name: 'recommend_workout',
          arguments: {
            input: {
              fitnessLevel: 'beginner',
              goal: 'general_fitness',
              timeAvailable: 30,
              equipment: ['dumbbells'],
              limitations: [],
            },
          },
        })

        expect(result.content).toBeDefined()
        expect(Array.isArray(result.content)).toBe(true)
        expect((result.content as any[]).length).toBeGreaterThan(0)

        const data = JSON.parse(result.content[0].text)
        expect(data).toHaveProperty('title')
        expect(data).toHaveProperty('duration')
        expect(data).toHaveProperty('exercises')
        expect(Array.isArray(data.exercises)).toBe(true)
      }
    )
  })

  describe('Resources', () => {
    it('should list available resources', async () => {
      const result = await client.listResources()

      expect(result.resources).toBeDefined()
      expect(Array.isArray(result.resources)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid tool name gracefully', async () => {
      const result = await client.callTool({
        name: 'nonexistent_tool',
        arguments: {},
      })

      expect(result.content).toBeDefined()
      expect(result.isError).toBe(true)
    })

    it('should handle invalid tool arguments', async () => {
      const result = await client.callTool({
        name: 'recommend_workout',
        arguments: {
          input: {
            fitnessLevel: 'invalid_level',
          },
        },
      })

      expect(result.content).toBeDefined()
      expect(result.isError).toBe(true)
    })
  })
})
