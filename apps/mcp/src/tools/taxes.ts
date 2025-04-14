import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { chromium } from 'playwright-chromium'
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
      const browser = await chromium.launch()
      const page = await browser.newPage()
      try {
        await page.goto('https://smartasset.com/taxes/income-taxes#E9mq41lGxO')

        // Input Household Income
        const incomeInput = page
          .getByRole('cell', { name: 'Household Income $' })
          .getByRole('textbox')
        await incomeInput.click()
        await incomeInput.press('ControlOrMeta+A')
        await incomeInput.fill(String(input.householdIncome))
        await incomeInput.press('Tab')

        // Input Location
        const locationInput = page.locator('input[name="ud-current-location-display"]')
        await locationInput.fill(input.location)
        // Use waitForSelector for better reliability than fixed timeout
        await page.waitForSelector('.tt-suggestion', { timeout: 5000 }) // Wait for suggestions to appear
        await locationInput.press('ArrowDown')
        await locationInput.press('Enter')

        // Wait for potential recalculation - using a specific element change is more robust
        // For example, wait for the 'Total Income Taxes' value to potentially change or appear
        // This requires identifying a stable element that updates.
        // Using a timeout as a fallback, but prefer selector-based waits.
        await page.waitForTimeout(3000)

        // Extract data from the table
        const taxTable = page.getByRole('table').filter({ hasText: 'Tax Type Marginal Tax Rate' })

        const taxData: TaxData = await taxTable.locator('tbody tr').evaluateAll((rows) => {
          const data: TaxData = {}
          // Keep headers array for reference if needed, but use explicit keys below
          // const headers = ['Tax Type', 'Marginal Tax Rate', 'Effective Tax Rate', '2024 Taxes*']

          for (const row of rows) {
            // Assert row as HTMLElement to access querySelectorAll
            const cells = Array.from((row as HTMLElement).querySelectorAll('td'))
            if (cells.length >= 4) {
              // Assert cell as HTMLElement to access textContent
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
                // Use explicit keys matching the TaxRow interface
                data[taxType] = {
                  'Marginal Tax Rate': (cells[1] as HTMLElement).textContent?.trim() || 'N/A',
                  'Effective Tax Rate': (cells[2] as HTMLElement).textContent?.trim() || 'N/A',
                  '2024 Taxes*': (cells[3] as HTMLElement).textContent?.trim() || 'N/A', // Adjust year if needed
                }
              }
            }
          }
          return data
        })

        // Extract summary data using more specific locators
        const summaryRowLocators = {
          'Total Effective Tax Rate': 'tr:has-text("Total Income Taxes") td:nth-child(3)',
          'Total Income Taxes': 'tr:has-text("Total Income Taxes") td:nth-child(4)',
          'Income After Taxes': 'tr:has-text("Income After Taxes") td:nth-child(2)',
          'Take-Home Pay': 'tr:has-text("Take-Home Pay") td:nth-child(2)',
        }

        const summary: TaxResult['summary'] = {
          'Total Effective Tax Rate':
            (
              await taxTable.locator(summaryRowLocators['Total Effective Tax Rate']).textContent()
            )?.trim() || 'N/A',
          'Total Income Taxes':
            (
              await taxTable.locator(summaryRowLocators['Total Income Taxes']).textContent()
            )?.trim() || 'N/A',
          'Income After Taxes':
            (
              await taxTable.locator(summaryRowLocators['Income After Taxes']).textContent()
            )?.trim() || 'N/A',
          'Take-Home Pay':
            (await taxTable.locator(summaryRowLocators['Take-Home Pay']).textContent())?.trim() ||
            'N/A',
        }

        const result: TaxResult = {
          taxBreakdown: taxData,
          summary: summary,
        }

        await browser.close()

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      } catch (error) {
        await browser.close() // Ensure browser closes on error
        console.error('[MCP Tax Tool Error]', error)
        // Provide a more structured error response
        const errorMessage =
          error instanceof Error ? `Error fetching tax info: ${error.message}` : String(error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
        }
      }
    }
  )
}
