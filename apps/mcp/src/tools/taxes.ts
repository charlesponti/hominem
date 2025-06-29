import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'

// Define the structure of the extracted tax data
interface TaxRow {
  'Marginal Tax Rate': string | number
  'Effective Tax Rate': string | number
  '2024 Taxes*': string | number // Adjust year if needed
}

interface TaxData {
  [taxType: string]: TaxRow
}

interface TaxResult {
  taxBreakdown: TaxData
  summary: {
    'Total Effective Tax Rate': string
    'Total Income Taxes': string
    'Income After Taxes': string
    'Take-Home Pay': string
  }
}

export function registerTaxTool(server: McpServer) {
  server.tool(
    'get_tax_info',
    {
      input: z.object({
        householdIncome: z
          .number()
          .describe('The total household income as a number (e.g., 210000)'),
        location: z.string().describe('The location for tax calculation (e.g., "Austin, TX")'),
      }),
    },
    async ({ input }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
      const stagehand = new Stagehand({
        env: (process.env.STAGEHAND_ENV || 'LOCAL') as 'LOCAL' | 'BROWSERBASE',
        modelName: (process.env.STAGEHAND_MODEL_NAME || 'gpt-4o-mini') as
          | 'gpt-4o-mini'
          | 'o1-mini'
          | 'o1-preview'
          | 'o3-mini'
          | 'gpt-4o'
          | 'gpt-4o-2024-08-06'
          | 'gpt-4.5-preview'
          | 'claude-3-5-sonnet-latest'
          | 'claude-3-5-sonnet-20241022'
          | 'claude-3-5-sonnet-20240620'
          | 'claude-3-opus-20240229'
          | 'claude-3-sonnet-20240229'
          | 'claude-3-haiku-20240307'
          | 'gemini-1.5-pro-latest'
          | 'gemini-1.5-flash-latest'
          | undefined,
        modelClientOptions: { apiKey: process.env.OPENAI_API_KEY },
      })
      await stagehand.init()
      const page = stagehand.page
      try {
        await page.goto('https://smartasset.com/taxes/income-taxes#E9mq41lGxO')

        const incomeInput = page
          .getByRole('cell', { name: 'Household Income $' })
          .getByRole('textbox')
        await incomeInput.click()
        await incomeInput.press('ControlOrMeta+A')
        await incomeInput.fill(String(input.householdIncome))
        await incomeInput.press('Tab')

        const locationInput = page.locator('input[name="ud-current-location-display"]')
        await locationInput.fill(input.location)
        await page.waitForSelector('.tt-suggestion', { timeout: 5000 })
        await locationInput.press('ArrowDown')
        await locationInput.press('Enter')

        await page.waitForSelector('tr:has-text("Total Income Taxes") td:nth-child(4)', { timeout: 10000 })

        const taxTable = page.getByRole('table').filter({ hasText: 'Tax Type Marginal Tax Rate' })
        const taxData: TaxData = await taxTable.locator('tbody tr').evaluateAll((rows) => {
          const data: TaxData = {}
          for (const row of rows) {
            const cells = Array.from((row as HTMLElement).querySelectorAll('td'))
            if (cells.length >= 4) {
              const taxType = (cells[0] as HTMLElement).textContent?.trim()
              if (
                taxType &&
                ![
                  'Total Income Taxes',
                  'Income After Taxes',
                  'Retirement Contributions',
                  'Take-Home Pay',
                ].includes(taxType)
              ) {
                data[taxType] = {
                  'Marginal Tax Rate': (cells[1] as HTMLElement).textContent?.trim() || 'N/A',
                  'Effective Tax Rate': (cells[2] as HTMLElement).textContent?.trim() || 'N/A',
                  '2024 Taxes*': (cells[3] as HTMLElement).textContent?.trim() || 'N/A',
                }
              }
            }
          }
          return data
        })

        const summaryRowLocators = {
          'Total Effective Tax Rate': 'tr:has-text("Total Income Taxes") td:nth-child(3)',
          'Total Income Taxes': 'tr:has-text("Total Income Taxes") td:nth-child(4)',
          'Income After Taxes': 'tr:has-text("Income After Taxes") td:nth-child(2)',
          'Take-Home Pay': 'tr:has-text("Take-Home Pay") td:nth-child(2)',
        }

        const summary: TaxResult['summary'] = {
          'Total Effective Tax Rate':
            (await taxTable.locator(summaryRowLocators['Total Effective Tax Rate']).textContent())?.trim() || 'N/A',
          'Total Income Taxes':
            (await taxTable.locator(summaryRowLocators['Total Income Taxes']).textContent())?.trim() || 'N/A',
          'Income After Taxes':
            (await taxTable.locator(summaryRowLocators['Income After Taxes']).textContent())?.trim() || 'N/A',
          'Take-Home Pay':
            (await taxTable.locator(summaryRowLocators['Take-Home Pay']).textContent())?.trim() || 'N/A',
        }

        const result: TaxResult = {
          taxBreakdown: taxData,
          summary,
        }

        await stagehand.close()
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        await stagehand.close()
        console.error('[MCP Tax Tool Error]', error)
        const errorMessage = error instanceof Error ? `Error fetching tax info: ${error.message}` : String(error)
        return { content: [{ type: 'text', text: JSON.stringify({ error: errorMessage }, null, 2) }] }
      }
    }
  )
}
