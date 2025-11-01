import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('MCP Server Functional Tests', () => {
  let client: Client
  let transport: StdioClientTransport

  beforeAll(async () => {
    // Create transport and client
    transport = new StdioClientTransport({
      command: 'node',
      args: ['build/index.js'],
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
      expect(result.tools.length).toBe(26)
    })

    it('should include expected health tools', async () => {
      const result = await client.listTools()
      const toolNames = result.tools.map((t) => t.name)

      expect(toolNames).toContain('recommend_workout')
      expect(toolNames).toContain('analyze_nutrition')
      expect(toolNames).toContain('analyze_sleep')
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
      expect(toolNames).toContain('login')
    })
  })

  describe('Tool Execution', () => {
    it('should execute workout recommendation tool', async () => {
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

      const data = JSON.parse((result.content as any[])[0].text)
      expect(data).toHaveProperty('title')
      expect(data).toHaveProperty('duration')
      expect(data).toHaveProperty('exercises')
      expect(Array.isArray(data.exercises)).toBe(true)
    })

    it('should execute nutrition analysis tool', async () => {
      const result = await client.callTool({
        name: 'analyze_nutrition',
        arguments: {
          input: {
            meals: ['Oatmeal with berries', 'Grilled chicken salad'],
            dietaryPreferences: ['high-protein'],
            calorieTarget: 2000,
          },
        },
      })

      expect(result.content).toBeDefined()
      const data = JSON.parse((result.content as any[])[0].text)

      expect(data).toHaveProperty('nutritionalQuality')
      expect(data).toHaveProperty('macroEstimate')
      expect(data.macroEstimate).toHaveProperty('protein')
      expect(data.macroEstimate).toHaveProperty('carbohydrates')
      expect(data.macroEstimate).toHaveProperty('fats')
    })

    it('should execute sleep analysis tool', async () => {
      const result = await client.callTool({
        name: 'analyze_sleep',
        arguments: {
          input: {
            hoursSlept: 7.5,
            bedTime: '10:30 PM',
            wakeTime: '6:00 AM',
            wakeupCount: 1,
            sleepQualitySelfRating: 8,
          },
        },
      })

      expect(result.content).toBeDefined()
      const data = JSON.parse((result.content as any[])[0].text)

      expect(data).toHaveProperty('qualityScore')
      expect(typeof data.qualityScore).toBe('number')
      expect(data.qualityScore).toBeGreaterThanOrEqual(0)
      expect(data.qualityScore).toBeLessThanOrEqual(100)
      expect(data).toHaveProperty('recommendations')
      expect(Array.isArray(data.recommendations)).toBe(true)
    })
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
      await expect(
        client.callTool({
          name: 'nonexistent_tool',
          arguments: {},
        })
      ).rejects.toThrow()
    })

    it('should handle invalid tool arguments', async () => {
      await expect(
        client.callTool({
          name: 'recommend_workout',
          arguments: {
            input: {
              // Missing required fields
              fitnessLevel: 'invalid_level' as any,
            },
          },
        })
      ).rejects.toThrow()
    })
  })
})
